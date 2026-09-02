import { ArrayBufferTarget, Muxer } from 'mp4-muxer'
import { ModuleData } from '@/types'
import { computeCanvasSize, RenderConfig, renderTimingFrame } from '@/lib/canvasRenderer'
import { computeActiveRegion, computeTotalDurationMs } from '@/lib/timingModel'
import {
  CameraState,
  computeFollowTarget,
  FOLLOW_TICK_MS,
  stepFollowCamera
} from '@/lib/followCamera'
import { clampFollowZoom } from '@/stores/useUIStore'

/**
 * MP4 export: follow playback, recorded.
 *
 * The video is a fixed-size viewport onto the chart driven by the same follow
 * camera as the screen (lib/followCamera.ts), so what the viewer sees is the
 * chart being painted with the camera scrolling and zooming to keep every
 * active module in frame. No sidebar, no window chrome. Frames are rendered
 * offscreen at exact millisecond offsets and encoded to H.264 with WebCodecs,
 * then muxed by mp4-muxer. This is deliberately *not* a screen recording: the
 * length depends only on the data and the chosen playback rate, never on how
 * fast the machine is.
 */

/** Candidate H.264 profiles, most compatible first. */
const CODEC_CANDIDATES = [
  'avc1.42001f', // Baseline 3.1: plays essentially everywhere
  'avc1.42002a', // Baseline 4.2: 1080p
  'avc1.4d0028', // Main 4.0
  'avc1.640028', // High 4.0
  'avc1.640033' // High 5.1: 1440p and above
]

export interface VideoExportOptions {
  /** Output frame size in pixels; rounded down to even, H.264 requires it. */
  width: number
  height: number
  /** Frames per second of the output file. */
  fps?: number
  /** Playback rate: 2 renders the cycle in half its real time, like the 2x control on screen. */
  speed?: number
  /** Zoom the camera starts from and returns to; it only zooms out from here. */
  baseZoom?: number
  /** Seconds to hold on the finished chart before the video ends. */
  tailHoldSeconds?: number
  /** Target bitrate in bits per second; derived from the frame size if omitted. */
  bitrate?: number
  coloringMode?: 'gradual' | 'instant'
  /** 0..1 progress reporting. */
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

export interface VideoExportResult {
  blob: Blob
  width: number
  height: number
  frameCount: number
  durationSeconds: number
}

export class VideoExportUnsupportedError extends Error {}
export class VideoExportAbortedError extends Error {}

/** Whether this build can encode video at all (WebCodecs + OffscreenCanvas). */
export function isVideoExportSupported(): boolean {
  return (
    typeof VideoEncoder !== 'undefined' &&
    typeof VideoFrame !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined'
  )
}

/** First codec the platform will actually accept at this frame size. */
async function pickCodec(width: number, height: number, framerate: number): Promise<string> {
  for (const codec of CODEC_CANDIDATES) {
    try {
      const support = await VideoEncoder.isConfigSupported({ codec, width, height, framerate })
      if (support.supported) return codec
    } catch {
      // Malformed-for-this-platform config; try the next candidate.
    }
  }
  throw new VideoExportUnsupportedError('No supported H.264 encoder configuration')
}

/** Round down to an even number: H.264 chroma subsampling requires it. */
const toEven = (n: number) => Math.max(2, Math.floor(n / 2) * 2)

/**
 * `config.cellWidth` and `config.cellHeight` are the zoom-1 cell size from
 * preferences; the camera scales them per frame.
 */
export async function exportToMP4(
  modules: ModuleData[],
  config: RenderConfig,
  options: VideoExportOptions
): Promise<VideoExportResult> {
  if (!isVideoExportSupported()) {
    throw new VideoExportUnsupportedError('WebCodecs video encoding is not available')
  }
  if (!modules.length) {
    throw new Error('No modules to export')
  }

  const {
    fps = 30,
    speed = 1,
    baseZoom = 1,
    tailHoldSeconds = 1,
    coloringMode = 'gradual',
    onProgress,
    signal
  } = options
  const width = toEven(options.width)
  const height = toEven(options.height)
  const viewport = { width, height }

  const animationMs = computeTotalDurationMs(modules)
  const playbackMs = animationMs / speed
  const totalMs = playbackMs + tailHoldSeconds * 1000
  const frameCount = Math.max(1, Math.ceil((totalMs / 1000) * fps))

  const codec = await pickCodec(width, height, fps)
  // About 0.12 bits per pixel per frame keeps flat vector-ish content clean
  // without producing a file too big to email.
  const bitrate = options.bitrate ?? Math.round(width * height * fps * 0.12)

  const target = new ArrayBufferTarget()
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width, height },
    // Everything is in memory anyway; this puts the moov atom up front so the
    // file starts playing immediately instead of only after a full download.
    fastStart: 'in-memory'
  })

  let encoderError: Error | null = null
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: err => {
      encoderError = err instanceof Error ? err : new Error(String(err))
    }
  })

  encoder.configure({
    codec,
    width,
    height,
    bitrate,
    framerate: fps,
    // The avc format emits an avcC decoder description, which the MP4 muxer needs.
    avc: { format: 'avc' },
    latencyMode: 'quality'
  })

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | null
  if (!ctx) {
    encoder.close()
    throw new Error('Failed to acquire a 2D context for video export')
  }

  // Camera plumbing: content bounds at a given zoom, and the tick length in
  // 60fps frames so the easing feels the same as on screen at any fps.
  const contentSize = (zoom: number) =>
    computeCanvasSize(modules, config.cellWidth * zoom, config.cellHeight * zoom)
  const maxScroll = (zoom: number) => {
    const size = contentSize(zoom)
    return { left: Math.max(0, size.width - width), top: Math.max(0, size.height - height) }
  }
  const framesPerTick = 1000 / fps / FOLLOW_TICK_MS

  let camera: CameraState = { zoom: clampFollowZoom(baseZoom), scrollLeft: 0, scrollTop: 0 }
  let lastRegion = computeActiveRegion(modules, 0)

  const advanceCamera = (animMs: number, frames: number) => {
    const region = computeActiveRegion(modules, animMs) ?? lastRegion
    if (!region) return
    lastRegion = region
    const cameraTarget = computeFollowTarget(
      region, config.cellWidth, config.cellHeight, viewport, baseZoom, clampFollowZoom
    )
    camera = stepFollowCamera(camera, cameraTarget, viewport, maxScroll, frames).state
  }

  // Let the camera settle on the opening frame so the video does not start
  // with a glide in from the origin.
  for (let i = 0; i < 120; i++) advanceCamera(0, 1)

  const frameDurationUs = Math.round(1_000_000 / fps)

  try {
    for (let frame = 0; frame < frameCount; frame++) {
      if (signal?.aborted) throw new VideoExportAbortedError('Export cancelled')
      if (encoderError) throw encoderError

      const videoMs = (frame / fps) * 1000
      const animMs = Math.min(videoMs * speed, animationMs)
      advanceCamera(animMs, framesPerTick)

      const size = contentSize(camera.zoom)
      ctx.save()
      ctx.fillStyle = config.backgroundColor
      ctx.fillRect(0, 0, width, height)
      ctx.translate(-camera.scrollLeft, -camera.scrollTop)
      renderTimingFrame(ctx as unknown as CanvasRenderingContext2D, {
        modules,
        config: {
          ...config,
          cellWidth: config.cellWidth * camera.zoom,
          cellHeight: config.cellHeight * camera.zoom
        },
        width: size.width,
        height: size.height,
        currentFrame: animMs,
        coloringMode
      })
      ctx.restore()

      const videoFrame = new VideoFrame(canvas, {
        timestamp: frame * frameDurationUs,
        duration: frameDurationUs
      })
      // A keyframe every 2s keeps seeking responsive in players and editors.
      encoder.encode(videoFrame, { keyFrame: frame % (fps * 2) === 0 })
      videoFrame.close()

      // Let the encoder drain, and give the UI a chance to paint progress.
      if (encoder.encodeQueueSize > fps) {
        await new Promise<void>(resolve => setTimeout(resolve, 0))
      }
      if (frame % 10 === 0) {
        onProgress?.(frame / frameCount)
        await new Promise<void>(resolve => setTimeout(resolve, 0))
      }
    }

    await encoder.flush()
    if (encoderError) throw encoderError
    muxer.finalize()
    onProgress?.(1)

    return {
      blob: new Blob([target.buffer], { type: 'video/mp4' }),
      width,
      height,
      frameCount,
      durationSeconds: totalMs / 1000
    }
  } finally {
    if (encoder.state !== 'closed') encoder.close()
  }
}

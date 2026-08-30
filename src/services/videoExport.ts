import { ArrayBufferTarget, Muxer } from 'mp4-muxer'
import { ModuleData } from '@/types'
import {
  computeCanvasSize,
  RenderConfig,
  renderTimingFrame
} from '@/lib/canvasRenderer'
import { computeTotalDurationMs } from '@/lib/timingModel'

/**
 * MP4 export.
 *
 * Frames are rendered offscreen with the same renderer the canvas uses and
 * encoded to H.264 with WebCodecs, then muxed into an MP4 by mp4-muxer. This is
 * deliberately *not* a screen recording: the animation is re-rendered at exact
 * millisecond offsets, so the video is frame-accurate and its length does not
 * depend on how fast the machine is or what playback speed was on screen.
 */

/** Candidate H.264 profiles, most compatible first. */
const CODEC_CANDIDATES = [
  'avc1.42001f', // Baseline 3.1  — plays essentially everywhere
  'avc1.42002a', // Baseline 4.2  — for larger canvases
  'avc1.4d0028', // Main 4.0
  'avc1.640028' // High 4.0
]

/** H.264 needs even dimensions; beyond this we scale down rather than crawl. */
const MAX_DIMENSION = 3840

export interface VideoExportOptions {
  /** Frames per second of the output file. */
  fps?: number
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
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        framerate
      })
      if (support.supported) return codec
    } catch {
      // Malformed-for-this-platform config; try the next candidate.
    }
  }
  throw new VideoExportUnsupportedError('No supported H.264 encoder configuration')
}

/** Round down to an even number — H.264 chroma subsampling requires it. */
const toEven = (n: number) => Math.max(2, Math.floor(n / 2) * 2)

function fitWithin(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
  return { width: toEven(width * scale), height: toEven(height * scale) }
}

export async function exportToMP4(
  modules: ModuleData[],
  config: RenderConfig,
  options: VideoExportOptions = {}
): Promise<VideoExportResult> {
  if (!isVideoExportSupported()) {
    throw new VideoExportUnsupportedError('WebCodecs video encoding is not available')
  }
  if (!modules.length) {
    throw new Error('No modules to export')
  }

  const {
    fps = 30,
    tailHoldSeconds = 1,
    coloringMode = 'gradual',
    onProgress,
    signal
  } = options

  const natural = computeCanvasSize(modules, config.cellWidth, config.cellHeight)
  const { width, height } = fitWithin(natural.width, natural.height)
  const renderScale = width / natural.width

  const animationMs = computeTotalDurationMs(modules)
  const totalMs = animationMs + tailHoldSeconds * 1000
  const frameCount = Math.max(1, Math.ceil((totalMs / 1000) * fps))

  const codec = await pickCodec(width, height, fps)
  // ~0.12 bits per pixel per frame keeps flat vector-ish content clean without
  // producing a file too big to email.
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
    // 'avc' format emits an avcC decoder description, which the MP4 muxer needs.
    avc: { format: 'avc' },
    latencyMode: 'quality'
  })

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | null
  if (!ctx) {
    encoder.close()
    throw new Error('Failed to acquire a 2D context for video export')
  }

  const frameDurationUs = Math.round(1_000_000 / fps)

  try {
    for (let frame = 0; frame < frameCount; frame++) {
      if (signal?.aborted) throw new VideoExportAbortedError('Export cancelled')
      if (encoderError) throw encoderError

      const currentFrameMs = Math.min((frame / fps) * 1000, totalMs)

      ctx.save()
      ctx.scale(renderScale, renderScale)
      renderTimingFrame(ctx as unknown as CanvasRenderingContext2D, {
        modules,
        config,
        width: natural.width,
        height: natural.height,
        currentFrame: currentFrameMs,
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

import React, { useRef, useEffect, useState } from 'react'
import { useProjectStore } from '@/stores/useProjectStore'
import { clampFollowZoom, useUIStore } from '@/stores/useUIStore'
import { computeActiveRegion } from '@/lib/timingModel'
import {
  CameraTarget,
  computeFollowTarget,
  FOLLOW_TICK_MS,
  snapIntoView,
  stepFollowCamera
} from '@/lib/followCamera'
import { useAnimationStore } from '@/stores/useAnimationStore'
import { usePreferencesStore } from '@/stores/usePreferencesStore'
import {
  computeCanvasSize,
  drawCrosshair,
  HEADER_HEIGHT,
  RenderConfig,
  renderTimingFrame
} from '@/lib/canvasRenderer'

/**
 * Mirror the canvas's vertical scroll onto the parameter table immediately.
 * The onScroll handler does the same, but scroll events are only delivered
 * with the next rendered frame; the follow camera moves between frames and
 * the table would visibly trail the chart by a step.
 */
function syncTableScroll(box: HTMLDivElement) {
  const table = document.querySelector<HTMLDivElement>('.parameter-scroll')
  if (table && Math.abs(table.scrollTop - box.scrollTop) > 0.5) {
    table.scrollTop = box.scrollTop
  }
}

interface GridCanvasProps {
  width: number
  height: number
}

export const GridCanvas: React.FC<GridCanvasProps> = ({ width: _, height: __ }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { project } = useProjectStore()
  const { zoom, zoomIn, zoomOut, followPlayback, followBaseZoom, applyFollowZoom } = useUIStore()
  const { currentFrame } = useAnimationStore()
  const { grid, animation, ui } = usePreferencesStore()

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const [renderKey, setRenderKey] = useState(0)
  // Backing-store scale. Without it the canvas renders at 1x and the browser
  // upscales it on a 125%/150% Windows display, which turns 11px labels into
  // mush. Re-read on resize: that also fires when the window moves to a
  // monitor with a different scale.
  const [dpr, setDpr] = useState(() => window.devicePixelRatio || 1)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  // Where the follow camera last saw activity, so it holds still in the gaps
  // between actions instead of snapping back to the origin.
  const lastActiveRegionRef = useRef<ReturnType<typeof computeActiveRegion>>(null)
  // Follow-camera target (chart space at zoom 1) and the timer loop easing
  // toward it. The loop is what lets a single jump — stop, scrub, toggle —
  // settle fully instead of moving only one easing step per frame change.
  // A timer rather than requestAnimationFrame so the camera keeps up when
  // the window is unfocused or covered, where rAF stops firing.
  const followTargetRef = useRef<CameraTarget | null>(null)
  const followLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Row geometry comes from preferences and must stay in step with the
  // parameter table: 12px title + 28px table header = the 40px HEADER_HEIGHT.
  // Zoom scales the cell geometry rather than the bitmap, so labels and
  // hairlines are re-rendered crisp at every level, and the table scales its
  // row height by the same factor so the two stay aligned.
  const ROW_HEIGHT = grid.cellHeight * zoom
  const CELL_WIDTH = grid.cellWidth * zoom

  // Calculate canvas dimensions based on project data
  useEffect(() => {
    setCanvasSize(computeCanvasSize(project?.modules ?? [], CELL_WIDTH, ROW_HEIGHT))
    // Force re-render when grid dimensions change
    setRenderKey(prev => prev + 1)
  }, [project, CELL_WIDTH, ROW_HEIGHT])

  // Main rendering function
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.scale(dpr, dpr)

    const config: RenderConfig = {
      cellWidth: CELL_WIDTH,
      cellHeight: ROW_HEIGHT,
      gridColor: '#e5e5e5',
      backgroundColor: '#ffffff',
      defaultFillColor: '#3b82f6',
      textDisplay: ui.canvasTextDisplay
    }

    // Same call the MP4 exporter makes, so screen and video cannot drift apart.
    renderTimingFrame(ctx, {
      modules: project?.modules ?? [],
      config,
      width: canvasSize.width,
      height: canvasSize.height,
      currentFrame,
      coloringMode: animation.coloringMode
    })

    // Crosshair is interaction chrome, so it stays out of renderTimingFrame.
    if (ui.crosshairEnabled) {
      drawCrosshair(ctx, mousePosition.x, mousePosition.y, canvasSize.width, canvasSize.height)
    }

    ctx.restore()
  }, [
    project,
    zoom,
    dpr,
    currentFrame,
    canvasSize,
    renderKey,
    CELL_WIDTH,
    ROW_HEIGHT,
    animation,
    ui.canvasTextDisplay,
    ui.crosshairEnabled,
    mousePosition
  ])

  // Force re-render when project changes
  useEffect(() => {
    if (project?.modules) {
      setRenderKey(prev => prev + 1)
    }
  }, [project?.modules, project?.updatedAt])

  // Force re-render when grid preferences change
  useEffect(() => {
    setRenderKey(prev => prev + 1)
  }, [grid.cellWidth, grid.cellHeight])

  // Track display scale changes (window dragged to another monitor, OS zoom).
  useEffect(() => {
    const handleResize = () => setDpr(window.devicePixelRatio || 1)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Follow playback: keep every cell that is being painted inside the
  // viewport. Zoom is only ever reduced from the user's base level, and only
  // when the active region would not fit; position is a camera that eases
  // toward centring the region, so a long horizontal run glides rather than
  // jumps. Runs on every frame change, so scrubbing and stepping follow too.
  useEffect(() => {
    if (!followPlayback) return
    const container = containerRef.current
    const modules = project?.modules ?? []
    if (!container || modules.length === 0) return

    const region = computeActiveRegion(modules, currentFrame) ?? lastActiveRegionRef.current
    if (!region) return
    lastActiveRegionRef.current = region

    followTargetRef.current = computeFollowTarget(
      region,
      grid.cellWidth,
      grid.cellHeight,
      { width: container.clientWidth, height: container.clientHeight },
      followBaseZoom,
      clampFollowZoom
    )

    if (followLoopRef.current !== null) return
    let lastTick = performance.now()
    const tick = () => {
      const target = followTargetRef.current
      const box = containerRef.current
      if (!target || !box) {
        followLoopRef.current = null
        return
      }

      // Easing is expressed per 60fps frame and rescaled to the real interval,
      // so when a big chart makes ticks late the camera takes bigger steps
      // instead of falling behind the playhead.
      const now = performance.now()
      const frames = Math.min(6, Math.max(0.5, (now - lastTick) / FOLLOW_TICK_MS))
      lastTick = now

      const { zoom: currentZoom } = useUIStore.getState()
      const { state: next, settled } = stepFollowCamera(
        { zoom: currentZoom, scrollLeft: box.scrollLeft, scrollTop: box.scrollTop },
        target,
        { width: box.clientWidth, height: box.clientHeight },
        // The DOM already reflects the laid-out zoom; it is the authority on travel.
        () => ({ left: box.scrollWidth - box.clientWidth, top: box.scrollHeight - box.clientHeight }),
        frames
      )

      if (next.zoom !== currentZoom) applyFollowZoom(next.zoom)
      box.scrollLeft = next.scrollLeft
      box.scrollTop = next.scrollTop
      syncTableScroll(box)

      followLoopRef.current = settled ? null : setTimeout(tick, FOLLOW_TICK_MS)
    }
    followLoopRef.current = setTimeout(tick, FOLLOW_TICK_MS)
  }, [followPlayback, currentFrame, followBaseZoom, project, grid.cellWidth, grid.cellHeight, applyFollowZoom])

  // The same in-view guarantee applied synchronously with every frame the
  // canvas paints, so the cells never sit outside the viewport for even the
  // one tick the easing loop takes to catch up.
  useEffect(() => {
    const target = followTargetRef.current
    const box = containerRef.current
    if (!followPlayback || !target || !box) return
    const snapped = snapIntoView(
      { zoom, scrollLeft: box.scrollLeft, scrollTop: box.scrollTop },
      target,
      { width: box.clientWidth, height: box.clientHeight }
    )
    box.scrollLeft = snapped.scrollLeft
    box.scrollTop = snapped.scrollTop
    syncTableScroll(box)
  }, [followPlayback, currentFrame, zoom])

  // Stop the follow loop when follow mode is turned off or the canvas unmounts.
  useEffect(() => {
    if (followPlayback) return
    if (followLoopRef.current !== null) {
      clearTimeout(followLoopRef.current)
      followLoopRef.current = null
    }
    followTargetRef.current = null
    lastActiveRegionRef.current = null
  }, [followPlayback])
  useEffect(() => () => {
    if (followLoopRef.current !== null) clearTimeout(followLoopRef.current)
  }, [])

  // Ctrl/Cmd + wheel zooms the chart. A native listener because React
  // registers wheel as passive, which makes preventDefault a no-op and lets
  // the browser zoom the whole page instead.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      if (e.deltaY < 0) zoomIn()
      else if (e.deltaY > 0) zoomOut()
    }
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [zoomIn, zoomOut])

  // Sync scroll with parameter table
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement
      const box = containerRef.current
      if (box && target.classList.contains('parameter-scroll') && Math.abs(box.scrollTop - target.scrollTop) > 0.5) {
        box.scrollTop = target.scrollTop
      }
    }

    // The table only renders its scroll container once there is data, so
    // re-attach whenever the project goes from empty to populated.
    const paramTable = document.querySelector('.parameter-scroll')
    if (paramTable) {
      paramTable.addEventListener('scroll', handleScroll)
      return () => paramTable.removeEventListener('scroll', handleScroll)
    }
  }, [project?.modules.length])

  // Ensure canvas container starts at correct position
  useEffect(() => {
    if (containerRef.current) {
      const paramTable = document.querySelector('.parameter-scroll')
      if (paramTable) {
        containerRef.current.scrollTop = paramTable.scrollTop
      }
    }
  }, [project])

  // Mouse tracking for crosshair and pan
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Chart coordinates are CSS pixels: zoom is baked into the cell size and
    // dpr only affects the backing store, so no conversion is needed.
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Handle panning - scroll the container instead of transforming coordinates
    if (isPanning && ui.panEnabled) {
      const deltaX = e.clientX - lastPanPoint.x
      const deltaY = e.clientY - lastPanPoint.y

      if (containerRef.current) {
        containerRef.current.scrollLeft -= deltaX
        containerRef.current.scrollTop -= deltaY
      }

      setLastPanPoint({ x: e.clientX, y: e.clientY })
    }

    if (ui.crosshairEnabled) {
      setMousePosition({ x, y })
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (ui.panEnabled && (e.button === 0 || e.button === 1)) { // Left or middle mouse button
      setIsPanning(true)
      setLastPanPoint({ x: e.clientX, y: e.clientY })
      e.preventDefault()
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  const handleMouseLeave = () => {
    setMousePosition({ x: -1, y: -1 }) // Hide crosshair when mouse leaves canvas
    setIsPanning(false)
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-muted/20 overflow-auto select-text"
      onScroll={(e) => {
        // Sync parameter table scroll (only vertical)
        const paramTable = document.querySelector('.parameter-scroll')
        if (paramTable) {
          paramTable.scrollTop = e.currentTarget.scrollTop
        }
      }}
    >
      <div className="min-w-max min-h-full">
        <canvas
          ref={canvasRef}
          width={Math.round(canvasSize.width * dpr)}
          height={Math.round(canvasSize.height * dpr)}
          data-timing-canvas="true"
          data-header-height={HEADER_HEIGHT}
          style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            display: 'block',
            cursor: isPanning ? 'grabbing' : (ui.panEnabled ? 'grab' : (ui.crosshairEnabled ? 'crosshair' : 'default'))
          }}
          className="bg-white border"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>
    </div>
  )
}

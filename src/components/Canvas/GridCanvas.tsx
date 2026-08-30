import React, { useRef, useEffect, useState } from 'react'
import { useProjectStore } from '@/stores/useProjectStore'
import { useUIStore } from '@/stores/useUIStore'
import { useAnimationStore } from '@/stores/useAnimationStore'
import { usePreferencesStore } from '@/stores/usePreferencesStore'
import {
  computeCanvasSize,
  drawCrosshair,
  HEADER_HEIGHT,
  RenderConfig,
  renderTimingFrame
} from '@/lib/canvasRenderer'

interface GridCanvasProps {
  width: number
  height: number
}

export const GridCanvas: React.FC<GridCanvasProps> = ({ width: _, height: __ }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { project } = useProjectStore()
  const { zoom } = useUIStore()
  const { currentFrame } = useAnimationStore()
  const { grid, animation, ui } = usePreferencesStore()

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const [renderKey, setRenderKey] = useState(0)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })

  // Row geometry comes from preferences and must stay in step with the
  // parameter table: 12px title + 28px table header = the 40px HEADER_HEIGHT.
  const ROW_HEIGHT = grid.cellHeight
  const CELL_WIDTH = grid.cellWidth

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
    ctx.scale(zoom, zoom)

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

  // Sync scroll with parameter table
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement
      if (containerRef.current && target.classList.contains('parameter-scroll')) {
        containerRef.current.scrollTop = target.scrollTop
      }
    }

    const paramTable = document.querySelector('.parameter-scroll')
    if (paramTable) {
      paramTable.addEventListener('scroll', handleScroll)
      return () => paramTable.removeEventListener('scroll', handleScroll)
    }
  }, [])

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

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * zoom
    const y = (e.clientY - rect.top) * zoom

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
          width={canvasSize.width * zoom}
          height={canvasSize.height * zoom}
          data-timing-canvas="true"
          data-header-height={HEADER_HEIGHT}
          style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            imageRendering: 'pixelated',
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

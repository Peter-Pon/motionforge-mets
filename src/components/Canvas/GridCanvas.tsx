import React, { useRef, useEffect, useState } from 'react'
import { useProjectStore } from '@/stores/useProjectStore'
import { useUIStore } from '@/stores/useUIStore'
import { useAnimationStore } from '@/stores/useAnimationStore'
import { usePreferencesStore } from '@/stores/usePreferencesStore'
import { ModuleData } from '@/types'

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
  
  // Constants for row alignment - match exactly with parameter table
  // 參數區域：參數標題12px + 表格頭部28px = 40px
  // 畫布區域：需要匹配這個40px的偏移量
  const HEADER_HEIGHT = 40 // Height to match parameter table offset
  const ROW_HEIGHT = grid.cellHeight // Height from preferences
  const CELL_WIDTH = grid.cellWidth // Width from preferences

  // Calculate canvas dimensions based on project data
  useEffect(() => {
    let canvasWidth = 800
    let canvasHeight = 600
    
    if (project && project.modules.length > 0) {
      const modules = project.modules
      
      // Calculate required width (max endX + padding) - use calculated position if available
      const maxEndX = Math.max(...modules.map(m => (m.calculatedStartX ?? m.startX) + m.moveCount)) + 10
      canvasWidth = Math.max(800, maxEndX * CELL_WIDTH)
      
      // Calculate required height to match parameter table rows
      const groupedModules = groupModulesByName(modules)
      const totalRows = groupedModules.reduce((acc, group) => acc + group.modules.length, 0)
      canvasHeight = Math.max(600, HEADER_HEIGHT + (totalRows * ROW_HEIGHT) + 100)
    }
    
    setCanvasSize({ width: canvasWidth, height: canvasHeight })
    // Force re-render when grid dimensions change
    setRenderKey(prev => prev + 1)
  }, [project, CELL_WIDTH, ROW_HEIGHT]) // Add dependencies for grid preferences

  // Main rendering function
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return


    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Apply zoom and pan
    ctx.save()
    ctx.scale(zoom, zoom)

    // Draw background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width / zoom, canvas.height / zoom)

    // Create config object with forced row height
    const config = {
      ...(project?.canvasConfig || {}),
      cellWidth: CELL_WIDTH,
      cellHeight: ROW_HEIGHT,
      showGrid: true,
      showRuler: true,
      gridColor: '#e5e5e5',
      backgroundColor: '#ffffff',
      defaultFillColor: '#3b82f6',
      textDisplay: ui.canvasTextDisplay
    }


    // Always draw grid
    drawGrid(ctx, canvasSize.width, canvasSize.height, config, HEADER_HEIGHT)

    // Always draw ruler
    drawRuler(ctx, canvasSize.width, canvasSize.height, config, HEADER_HEIGHT)

    // Draw module tracks if we have project data
    if (project && project.modules.length > 0) {
      // Draw static grid cells
      drawModuleTracksAligned(ctx, project.modules, config, HEADER_HEIGHT)
      
      // Draw animation overlay if playing
      if (currentFrame > 0) {
        drawAnimationOverlay(ctx, project.modules, config, currentFrame, HEADER_HEIGHT, animation.coloringMode)
      }
    }

    // Draw crosshair if enabled
    if (ui.crosshairEnabled) {
      drawCrosshair(ctx, mousePosition.x, mousePosition.y, canvasSize.width, canvasSize.height)
    }

    ctx.restore()
  }, [project, zoom, currentFrame, canvasSize, renderKey, grid, animation, ui.crosshairEnabled, mousePosition]) // Add UI dependencies

  // Force re-render when project changes
  useEffect(() => {
    if (project?.modules) {
      // Force re-render by updating renderKey
      setRenderKey(prev => prev + 1)
    }
  }, [project?.modules, project?.updatedAt]) // Add updatedAt to detect any project changes

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
    
    // Listen to parameter table scroll
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
      
      // Find the canvas container and scroll it
      if (containerRef.current) {
        containerRef.current.scrollLeft -= deltaX
        containerRef.current.scrollTop -= deltaY
      }
      
      setLastPanPoint({ x: e.clientX, y: e.clientY })
    }
    
    // Handle crosshair
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

// Helper function to group modules by name
function groupModulesByName(modules: ModuleData[]): { name: string; modules: ModuleData[] }[] {
  const groups: { [key: string]: ModuleData[] } = {}
  
  modules.forEach(module => {
    if (!groups[module.moduleName]) {
      groups[module.moduleName] = []
    }
    groups[module.moduleName].push(module)
  })
  
  return Object.entries(groups).map(([name, modules]) => ({
    name,
    modules
  }))
}

// Helper function to convert hex color to rgba
function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    const r = parseInt(result[1], 16)
    const g = parseInt(result[2], 16)
    const b = parseInt(result[3], 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return hex
}

// Helper functions
/*
function drawBasicGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const cellWidth = 20
  const cellHeight = 26
  
  ctx.strokeStyle = '#e5e5e5'
  ctx.lineWidth = 0.5

  // Vertical lines
  for (let x = 0; x <= width; x += cellWidth) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += cellHeight) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}
*/

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: any,
  headerHeight: number
) {
  
  ctx.strokeStyle = config.gridColor || '#333333' // Make darker for visibility
  ctx.lineWidth = 0.5 // Use thinner lines to reduce alignment issues

  // Vertical lines - offset by 0.5 to account for line width
  for (let x = 0; x <= width; x += config.cellWidth) {
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, height)
    ctx.stroke()
  }

  // Horizontal lines - aligned with table rows, offset by 0.5 to account for line width
  ctx.beginPath()
  ctx.moveTo(0, headerHeight + 0.5)
  ctx.lineTo(width, headerHeight + 0.5)
  ctx.stroke()
  
  for (let y = headerHeight; y <= height; y += config.cellHeight) {
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(width, y + 0.5)
    ctx.stroke()
  }
}

function drawRuler(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: any,
  headerHeight: number
) {
  
  const RULER_WIDTH = 30 // Width of vertical ruler on the right
  
  // Draw horizontal ruler background (top)
  ctx.fillStyle = '#f3f4f6'
  ctx.fillRect(0, 0, width, headerHeight)
  
  // Draw vertical ruler background (right side)
  ctx.fillStyle = '#f3f4f6'
  ctx.fillRect(width - RULER_WIDTH, 0, RULER_WIDTH, height)

  ctx.fillStyle = '#6b7280'
  ctx.font = '10px monospace'
  
  // X-axis numbers (horizontal ruler at top)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < width / config.cellWidth; i += 5) {
    ctx.fillText(String(i), i * config.cellWidth + config.cellWidth / 2, headerHeight / 2)
  }

  // Y-axis numbers (vertical ruler on right side)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  let rowIndex = 0
  for (let y = headerHeight + config.cellHeight; y < height; y += config.cellHeight) {
    ctx.fillText(String(rowIndex + 1), width - RULER_WIDTH/2, y - config.cellHeight / 2)
    rowIndex++
  }
}

function drawModuleTracksAligned(
  ctx: CanvasRenderingContext2D,
  modules: any[],
  config: any,
  headerHeight: number
) {
  let currentY = headerHeight
  
  modules.forEach((module) => {
    // Draw individual cells for each module - use calculated position if available
    const actualStartX = module.calculatedStartX ?? module.startX
    for (let i = 0; i < module.moveCount; i++) {
      const cellX = (actualStartX + i) * config.cellWidth
      const cellY = currentY
      
      // Fill cell with module color with 20% transparency (default state)
      const color = module.color || config.defaultFillColor
      ctx.fillStyle = hexToRgba(color, 0.2)
      ctx.fillRect(cellX, cellY, config.cellWidth, config.cellHeight)
      
      // Draw cell border with module color
      ctx.strokeStyle = color // Use module color for border
      ctx.lineWidth = 0.5 // Use thinner lines for consistency
      ctx.strokeRect(cellX + 0.5, cellY + 0.5, config.cellWidth - 1, config.cellHeight - 1)
    }
    
    // Draw text based on user preference
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    
    const textX = (module.calculatedStartX ?? module.startX) * config.cellWidth + 4
    const textY = currentY + config.cellHeight / 2
    
    // Get text content based on preference
    let textContent = ''
    switch (config.textDisplay) {
      case 'module':
        textContent = module.moduleName
        break
      case 'stage':
        textContent = module.stage || ''
        break
      case 'action':
      default:
        textContent = module.actionDescription
        break
    }
    
    // Draw text shadow for better visibility
    ctx.fillStyle = '#000000'
    ctx.fillText(textContent, textX + 1, textY + 1)
    
    // Draw white text
    ctx.fillStyle = '#ffffff'
    ctx.fillText(textContent, textX, textY)
    
    currentY += config.cellHeight
  })
}

function drawAnimationOverlay(
  ctx: CanvasRenderingContext2D,
  modules: any[],
  config: any,
  currentFrame: number, // currentFrame is in milliseconds
  headerHeight: number,
  coloringMode: 'gradual' | 'instant' = 'gradual'
) {
  // Group modules by name for sequential execution
  const groupedModules = groupModulesByName(modules)
  
  // Create a map of module to row index
  const moduleToRowIndex = new Map()
  modules.forEach((module, index) => {
    moduleToRowIndex.set(module, index)
  })
  
  groupedModules.forEach((group) => {
    // Calculate start times for all actions in this group
    const actionStartTimes: number[] = []
    
    group.modules.forEach((module, actionIndex) => {
      let actionStartTime = 0
      
      if (actionIndex > 0) {
        const prevModule = group.modules[actionIndex - 1]
        const prevStartTime = actionStartTimes[actionIndex - 1]
        
        if (module.isSequentialAction) {
          // For sequential actions, start when previous action completes
          actionStartTime = prevStartTime + (prevModule.moveCount * prevModule.duration)
        } else {
          // For position-based actions, calculate based on positions
          const currentStartX = module.calculatedStartX ?? module.startX
          const prevStartX = prevModule.calculatedStartX ?? prevModule.startX
          const cellsNeeded = Math.max(0, currentStartX - prevStartX)
          actionStartTime = prevStartTime + (cellsNeeded * prevModule.duration)
        }
      }
      
      actionStartTimes.push(actionStartTime)
    })
    
    group.modules.forEach((module, actionIndex) => {
      const rowIndex = moduleToRowIndex.get(module)
      const currentY = headerHeight + rowIndex * config.cellHeight
      const actionStartTime = actionStartTimes[actionIndex]
      
      // Check if this action should be active
      if (currentFrame >= actionStartTime) {
        const color = module.color || config.defaultFillColor
        
        if (coloringMode === 'instant') {
          // Instant mode: fill each cell instantly then wait for the duration
          const elapsedInAction = currentFrame - actionStartTime
          const currentCellIndex = Math.floor(elapsedInAction / module.duration)
          
          // Fill all completed cells (each filled instantly after its wait period)
          const actualStartX = module.calculatedStartX ?? module.startX
          ctx.fillStyle = hexToRgba(color, 0.8)
          for (let i = 0; i <= Math.min(currentCellIndex, module.moveCount - 1); i++) {
            const cellX = (actualStartX + i) * config.cellWidth
            const cellY = currentY
            ctx.fillRect(cellX, cellY, config.cellWidth, config.cellHeight)
            
            // Redraw border
            ctx.strokeStyle = color
            ctx.lineWidth = 0.5
            ctx.strokeRect(cellX + 0.5, cellY + 0.5, config.cellWidth - 1, config.cellHeight - 1)
          }
          
          // Highlight current active cell if within bounds
          if (currentCellIndex < module.moveCount) {
            const cellX = (actualStartX + currentCellIndex) * config.cellWidth
            const cellY = currentY
            
            // Draw highlighted border for current waiting cell
            ctx.strokeStyle = color
            ctx.lineWidth = 1.5
            ctx.strokeRect(cellX + 0.5, cellY + 0.5, config.cellWidth - 1, config.cellHeight - 1)
          }
        } else {
          // Gradual mode: original progressive filling behavior
          const elapsedInAction = currentFrame - actionStartTime
          const cellsCompleted = Math.floor(elapsedInAction / module.duration)
          const currentCellProgress = (elapsedInAction % module.duration) / module.duration
          
          // Draw all completed cells with 80% opacity
          const actualStartX = module.calculatedStartX ?? module.startX
          ctx.fillStyle = hexToRgba(color, 0.8)
          for (let i = 0; i < Math.min(cellsCompleted, module.moveCount); i++) {
            const cellX = (actualStartX + i) * config.cellWidth
            const cellY = currentY
            ctx.fillRect(cellX, cellY, config.cellWidth, config.cellHeight)
            
            // Redraw border
            ctx.strokeStyle = color
            ctx.lineWidth = 0.5
            ctx.strokeRect(cellX + 0.5, cellY + 0.5, config.cellWidth - 1, config.cellHeight - 1)
          }
          
          // Draw current cell being filled
          if (cellsCompleted < module.moveCount && currentCellProgress > 0) {
            const cellX = (actualStartX + cellsCompleted) * config.cellWidth
            const cellY = currentY
            
            // Draw partial fill with 80% opacity
            ctx.fillStyle = hexToRgba(color, 0.8)
            ctx.fillRect(cellX, cellY, config.cellWidth * currentCellProgress, config.cellHeight)
            
            // Draw highlighted border for active cell
            ctx.strokeStyle = color
            ctx.lineWidth = 1.5
            ctx.strokeRect(cellX + 0.5, cellY + 0.5, config.cellWidth - 1, config.cellHeight - 1)
          }
        }
      }
    })
  })
}

// Draw crosshair cursor effect
function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  mouseX: number,
  mouseY: number,
  canvasWidth: number,
  canvasHeight: number
) {
  if (mouseX < 0 || mouseY < 0) return // Don't draw if mouse is outside canvas
  
  ctx.save()
  
  // Set crosshair style
  ctx.strokeStyle = '#ff0000' // Red color for visibility
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.7
  ctx.setLineDash([5, 5]) // Dashed line for better visibility
  
  // Draw vertical line (full height)
  ctx.beginPath()
  ctx.moveTo(mouseX, 0)
  ctx.lineTo(mouseX, canvasHeight)
  ctx.stroke()
  
  // Draw horizontal line (full width)
  ctx.beginPath()
  ctx.moveTo(0, mouseY)
  ctx.lineTo(canvasWidth, mouseY)
  ctx.stroke()
  
  ctx.restore()
}
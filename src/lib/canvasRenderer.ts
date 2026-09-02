import { ModuleData } from '@/types'
import { computeActionStartTimes, groupModulesByName } from './timingModel'
import { CanvasSurface, DrawSurface, SvgSurface } from './drawSurface'

/**
 * Timing chart renderer — every pixel of the chart is drawn here.
 *
 * Drawing goes through DrawSurface, so the same code produces the on-screen
 * canvas, the frames handed to the MP4 encoder, and the vector chart embedded
 * in the PDF report. If one of the three ever looks different from the others,
 * it is a bug in a caller, not three copies of the drawing code drifting apart.
 */

/** Height reserved for the ruler, matching the parameter table's header. */
export const HEADER_HEIGHT = 40

/** Width of the row-number ruler down the right edge. */
const RULER_WIDTH = 30

const RULER_FONT_FAMILY = 'monospace'
const RULER_FONT_SIZE = 10

// Same stack the PDF report uses, so a CJK action name looks the same on
// screen, in the MP4 and on paper instead of falling back to whatever the
// platform picks for a bare "sans-serif".
const LABEL_FONT_FAMILY =
  '"Segoe UI", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans CJK SC", "Noto Sans CJK KR", system-ui, sans-serif'
const LABEL_INK = '#12161B'
const LABEL_HALO = 'rgba(255, 255, 255, 0.92)'
const LABEL_HALO_WIDTH = 3

/**
 * Label size follows the row height, so a taller grid — or a zoomed-in view,
 * which arrives here as a taller row — gets proportionally larger text.
 */
function labelFontSize(cellHeight: number): number {
  return Math.round(Math.min(22, cellHeight * 0.42))
}

/** Below this the label is noise: it cannot be read and it spills onto neighbouring rows. */
const MIN_LABEL_FONT_SIZE = 6

export interface RenderConfig {
  cellWidth: number
  cellHeight: number
  gridColor: string
  backgroundColor: string
  defaultFillColor: string
  textDisplay: 'module' | 'stage' | 'action'
}

export const DEFAULT_RENDER_CONFIG: Omit<RenderConfig, 'cellWidth' | 'cellHeight'> = {
  gridColor: '#e5e5e5',
  backgroundColor: '#ffffff',
  defaultFillColor: '#3b82f6',
  textDisplay: 'action'
}

/**
 * Natural size of the chart for a given module set. The screen clamps this to a
 * minimum of 800x600 so an empty project still shows a grid; the exporters use
 * the same numbers so their framing matches what the user was looking at.
 */
export function computeCanvasSize(
  modules: ModuleData[],
  cellWidth: number,
  cellHeight: number
): { width: number; height: number } {
  if (!modules.length) {
    return { width: 800, height: 600 }
  }

  const maxEndX =
    Math.max(...modules.map(m => (m.calculatedStartX ?? m.startX) + m.moveCount)) + 10

  return {
    width: Math.max(800, maxEndX * cellWidth),
    height: Math.max(600, HEADER_HEIGHT + modules.length * cellHeight + 100)
  }
}

/**
 * Tight size for print/export: no 800x600 floor and only a little padding.
 *
 * The on-screen size deliberately fills the window, which on a four-module
 * project means twenty empty rows. On paper that is just wasted page, and it
 * shrinks the chart — so the report measures the content instead.
 */
export function computeContentSize(
  modules: ModuleData[],
  cellWidth: number,
  cellHeight: number
): { width: number; height: number } {
  if (!modules.length) {
    return { width: 800, height: 600 }
  }

  const maxEndX =
    Math.max(...modules.map(m => (m.calculatedStartX ?? m.startX) + m.moveCount))
  // Enough columns to clear the row-number ruler, plus one for breathing room.
  const trailingColumns = Math.ceil((RULER_WIDTH + cellWidth) / cellWidth)

  return {
    width: (maxEndX + trailingColumns) * cellWidth,
    height: HEADER_HEIGHT + (modules.length + 1) * cellHeight
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    const r = parseInt(result[1], 16)
    const g = parseInt(result[2], 16)
    const b = parseInt(result[3], 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return hex
}

export function drawGrid(
  surface: DrawSurface,
  width: number,
  height: number,
  config: RenderConfig,
  headerHeight: number
) {
  // Offset by 0.5 so hairlines land on a pixel boundary rather than blurring.
  for (let x = 0; x <= width; x += config.cellWidth) {
    surface.line(x + 0.5, 0, x + 0.5, height, config.gridColor, 0.5)
  }

  surface.line(0, headerHeight + 0.5, width, headerHeight + 0.5, config.gridColor, 0.5)

  for (let y = headerHeight; y <= height; y += config.cellHeight) {
    surface.line(0, y + 0.5, width, y + 0.5, config.gridColor, 0.5)
  }
}

export function drawRuler(
  surface: DrawSurface,
  width: number,
  height: number,
  config: RenderConfig,
  headerHeight: number
) {
  surface.rect(0, 0, width, headerHeight, { fill: '#f3f4f6' })
  surface.rect(width - RULER_WIDTH, 0, RULER_WIDTH, height, { fill: '#f3f4f6' })

  const rulerText = {
    fill: '#6b7280',
    fontSize: RULER_FONT_SIZE,
    fontFamily: RULER_FONT_FAMILY,
    align: 'center' as const
  }

  // Label every 5th column, or a coarser multiple of 5 once the cells are
  // narrow enough (zoomed out) that adjacent numbers would collide.
  const columnStep = 5 * Math.max(1, Math.ceil(40 / (5 * config.cellWidth)))
  for (let i = 0; i < width / config.cellWidth; i += columnStep) {
    surface.text(
      String(i),
      i * config.cellWidth + config.cellWidth / 2,
      headerHeight / 2,
      rulerText
    )
  }

  // Same for row numbers: skip rows shorter than the digits are tall.
  const rowStep = Math.max(1, Math.ceil(RULER_FONT_SIZE / config.cellHeight))
  let rowIndex = 0
  for (let y = headerHeight + config.cellHeight; y < height; y += config.cellHeight) {
    if (rowIndex % rowStep === 0) {
      surface.text(
        String(rowIndex + 1),
        width - RULER_WIDTH / 2,
        y - config.cellHeight / 2,
        rulerText
      )
    }
    rowIndex++
  }
}

/** Label shown inside a module's track, per the user's text-display preference. */
export function moduleLabel(module: ModuleData, textDisplay: RenderConfig['textDisplay']): string {
  switch (textDisplay) {
    case 'module':
      return module.moduleName
    case 'stage':
      return module.stage || ''
    case 'action':
    default:
      return module.actionDescription
  }
}

/** The static track for every module: the cells it will eventually occupy. */
export function drawModuleTracksAligned(
  surface: DrawSurface,
  modules: ModuleData[],
  config: RenderConfig,
  headerHeight: number
) {
  let currentY = headerHeight

  modules.forEach(module => {
    const actualStartX = module.calculatedStartX ?? module.startX
    const color = module.color || config.defaultFillColor

    for (let i = 0; i < module.moveCount; i++) {
      const cellX = (actualStartX + i) * config.cellWidth
      surface.rect(cellX, currentY, config.cellWidth, config.cellHeight, {
        fill: hexToRgba(color, 0.2)
      })
      surface.rect(cellX + 0.5, currentY + 0.5, config.cellWidth - 1, config.cellHeight - 1, {
        stroke: color,
        lineWidth: 0.5
      })
    }

    currentY += config.cellHeight
  })
}

/**
 * Track labels, painted last so they sit on top of the animation fill.
 *
 * A label straddles cells in every state at once — the 20% tint of an idle
 * track, the 80% fill of a finished one, and the half-filled cell in between —
 * so no single text colour can win against the background. Ink text with a
 * paper outline works on all of them: on the tint it is simply dark on light,
 * on the fill the outline separates the glyphs from the colour.
 */
export function drawModuleLabels(
  surface: DrawSurface,
  modules: ModuleData[],
  config: RenderConfig,
  headerHeight: number
) {
  const fontSize = labelFontSize(config.cellHeight)
  if (fontSize < MIN_LABEL_FONT_SIZE) return

  modules.forEach((module, rowIndex) => {
    const label = moduleLabel(module, config.textDisplay)
    if (!label) return

    const actualStartX = module.calculatedStartX ?? module.startX
    const textX = actualStartX * config.cellWidth + 4
    const textY = headerHeight + rowIndex * config.cellHeight + config.cellHeight / 2

    surface.text(label, textX, textY, {
      fill: LABEL_INK,
      fontSize,
      fontFamily: LABEL_FONT_FAMILY,
      halo: LABEL_HALO,
      haloWidth: LABEL_HALO_WIDTH
    })
  })
}

/** The animated fill: how far each module has progressed at `currentFrame` ms. */
export function drawAnimationOverlay(
  surface: DrawSurface,
  modules: ModuleData[],
  config: RenderConfig,
  currentFrame: number,
  headerHeight: number,
  coloringMode: 'gradual' | 'instant' = 'gradual'
) {
  const moduleToRowIndex = new Map<ModuleData, number>()
  modules.forEach((module, index) => moduleToRowIndex.set(module, index))

  groupModulesByName(modules).forEach(group => {
    const actionStartTimes = computeActionStartTimes(group.modules)

    group.modules.forEach((module, actionIndex) => {
      const rowIndex = moduleToRowIndex.get(module) ?? 0
      const currentY = headerHeight + rowIndex * config.cellHeight
      const actionStartTime = actionStartTimes[actionIndex]

      if (currentFrame < actionStartTime) return

      const color = module.color || config.defaultFillColor
      const activeFill = hexToRgba(color, 0.8)
      const actualStartX = module.calculatedStartX ?? module.startX
      const elapsedInAction = currentFrame - actionStartTime

      if (coloringMode === 'instant') {
        // Each cell snaps to full colour, then holds for its duration.
        const currentCellIndex = Math.floor(elapsedInAction / module.duration)

        for (let i = 0; i <= Math.min(currentCellIndex, module.moveCount - 1); i++) {
          const cellX = (actualStartX + i) * config.cellWidth
          surface.rect(cellX, currentY, config.cellWidth, config.cellHeight, { fill: activeFill })
          surface.rect(cellX + 0.5, currentY + 0.5, config.cellWidth - 1, config.cellHeight - 1, {
            stroke: color,
            lineWidth: 0.5
          })
        }

        if (currentCellIndex < module.moveCount) {
          const cellX = (actualStartX + currentCellIndex) * config.cellWidth
          surface.rect(cellX + 0.5, currentY + 0.5, config.cellWidth - 1, config.cellHeight - 1, {
            stroke: color,
            lineWidth: 1.5
          })
        }
        return
      }

      // Gradual: completed cells filled, the active cell filled proportionally.
      const cellsCompleted = Math.floor(elapsedInAction / module.duration)
      const currentCellProgress = (elapsedInAction % module.duration) / module.duration

      for (let i = 0; i < Math.min(cellsCompleted, module.moveCount); i++) {
        const cellX = (actualStartX + i) * config.cellWidth
        surface.rect(cellX, currentY, config.cellWidth, config.cellHeight, { fill: activeFill })
        surface.rect(cellX + 0.5, currentY + 0.5, config.cellWidth - 1, config.cellHeight - 1, {
          stroke: color,
          lineWidth: 0.5
        })
      }

      if (cellsCompleted < module.moveCount && currentCellProgress > 0) {
        const cellX = (actualStartX + cellsCompleted) * config.cellWidth
        surface.rect(cellX, currentY, config.cellWidth * currentCellProgress, config.cellHeight, {
          fill: activeFill
        })
        surface.rect(cellX + 0.5, currentY + 0.5, config.cellWidth - 1, config.cellHeight - 1, {
          stroke: color,
          lineWidth: 1.5
        })
      }
    })
  })
}

/** Interaction chrome, so it stays canvas-only and out of every export. */
export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  mouseX: number,
  mouseY: number,
  canvasWidth: number,
  canvasHeight: number
) {
  if (mouseX < 0 || mouseY < 0) return

  ctx.save()
  ctx.strokeStyle = '#ff0000'
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.7
  ctx.setLineDash([5, 5])

  ctx.beginPath()
  ctx.moveTo(mouseX, 0)
  ctx.lineTo(mouseX, canvasHeight)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(0, mouseY)
  ctx.lineTo(canvasWidth, mouseY)
  ctx.stroke()

  ctx.restore()
}

export interface RenderFrameOptions {
  modules: ModuleData[]
  config: RenderConfig
  width: number
  height: number
  /** Playback position in milliseconds. */
  currentFrame: number
  coloringMode?: 'gradual' | 'instant'
  headerHeight?: number
}

function paintFrame(surface: DrawSurface, options: RenderFrameOptions) {
  const {
    modules,
    config,
    width,
    height,
    currentFrame,
    coloringMode = 'gradual',
    headerHeight = HEADER_HEIGHT
  } = options

  surface.rect(0, 0, width, height, { fill: config.backgroundColor })

  drawGrid(surface, width, height, config, headerHeight)
  drawRuler(surface, width, height, config, headerHeight)

  if (modules.length > 0) {
    drawModuleTracksAligned(surface, modules, config, headerHeight)
    if (currentFrame > 0) {
      drawAnimationOverlay(surface, modules, config, currentFrame, headerHeight, coloringMode)
    }
    drawModuleLabels(surface, modules, config, headerHeight)
  }
}

/** Draw one complete frame of the chart onto a 2D canvas context. */
export function renderTimingFrame(ctx: CanvasRenderingContext2D, options: RenderFrameOptions) {
  paintFrame(new CanvasSurface(ctx), options)
}

/**
 * Render the chart as standalone SVG markup, for embedding in the PDF report.
 * Pass `currentFrame: Infinity` for the finished state — the chart with every
 * module's track fully coloured, which is what a printed report should show.
 */
export function renderTimingFrameSvg(options: RenderFrameOptions): string {
  const surface = new SvgSurface(options.width, options.height)
  paintFrame(surface, options)
  return surface.toSvg()
}

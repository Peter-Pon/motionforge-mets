import { HEADER_HEIGHT } from './canvasRenderer'
import { ActiveRegion } from './timingModel'

/**
 * Follow camera — keeps the cells being painted inside a viewport.
 *
 * Pure functions over plain numbers so the same camera drives two outputs:
 * the on-screen canvas (GridCanvas applies the state to a scroll container)
 * and the MP4 exporter (which applies it as a translate before rendering each
 * frame). The exported video therefore *is* follow playback, not an imitation
 * of it. Chart space is measured at zoom 1; a state carries the zoom actually
 * in use and the scroll offset in zoomed pixels.
 */

/** Easing is expressed per 60fps frame; callers rescale to their real interval. */
export const FOLLOW_TICK_MS = 1000 / 60

export interface Viewport {
  width: number
  height: number
}

export interface CameraTarget {
  /** Zoom the viewport should be at: the base level, reduced until the region fits. */
  zoom: number
  /** Padded bounding box of the active cells, chart space at zoom 1. */
  x0: number
  x1: number
  y0: number
  y1: number
}

export interface CameraState {
  zoom: number
  scrollLeft: number
  scrollTop: number
}

/** Cells kept in view around the active ones: a little of what was just painted, more of what comes next. */
const CELLS_BEHIND = 2
const CELLS_AHEAD = 3
const ROWS_AROUND = 1
/** Breathing room between the padded region and the viewport edge when fitting zoom. */
const FIT_MARGIN = 16

const ZOOM_EPSILON = 0.004
const SCROLL_EPSILON = 0.5

export function computeFollowTarget(
  region: ActiveRegion,
  cellWidth: number,
  cellHeight: number,
  viewport: Viewport,
  baseZoom: number,
  clampZoom: (zoom: number) => number
): CameraTarget {
  const x0 = Math.max(0, region.minCol - CELLS_BEHIND) * cellWidth
  const x1 = (region.maxCol + 1 + CELLS_AHEAD) * cellWidth
  const y0 = HEADER_HEIGHT + Math.max(0, region.minRow - ROWS_AROUND) * cellHeight
  const y1 = HEADER_HEIGHT + (region.maxRow + 1 + ROWS_AROUND) * cellHeight

  const viewW = Math.max(1, viewport.width - FIT_MARGIN)
  const viewH = Math.max(1, viewport.height - FIT_MARGIN)
  const fitZoom = Math.min(viewW / (x1 - x0), viewH / (y1 - y0))

  // Only ever zoom out from the base level, and only as far as needed.
  return { zoom: clampZoom(Math.min(baseZoom, fitZoom)), x0, x1, y0, y1 }
}

/** Largest scroll offsets the content allows at a given zoom. */
export type MaxScroll = (zoom: number) => { left: number; top: number }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Hard guarantee behind the easing: if the active cells have slipped past an
 * edge of the viewport, move so they are inside it right now. Only along an
 * axis where they fit — while the zoom is still easing out they may not, and
 * then centring (the easing's job) is the best that can be done.
 */
export function snapIntoView(state: CameraState, target: CameraTarget, viewport: Viewport): CameraState {
  const { zoom } = state
  let { scrollLeft, scrollTop } = state
  const rx0 = target.x0 * zoom
  const rx1 = target.x1 * zoom
  const ry0 = target.y0 * zoom
  const ry1 = target.y1 * zoom
  if (rx1 - rx0 <= viewport.width) {
    if (rx0 < scrollLeft) scrollLeft = rx0
    else if (rx1 > scrollLeft + viewport.width) scrollLeft = rx1 - viewport.width
  }
  if (ry1 - ry0 <= viewport.height) {
    if (ry0 < scrollTop) scrollTop = ry0
    else if (ry1 > scrollTop + viewport.height) scrollTop = ry1 - viewport.height
  }
  return { zoom, scrollLeft: Math.max(0, scrollLeft), scrollTop: Math.max(0, scrollTop) }
}

/**
 * Advance the camera one tick toward the target.
 *
 * `frames` is the tick length in 60fps frames: 1 for a nominal tick, more when
 * a heavy chart made the tick late (the camera then takes a bigger step rather
 * than falling behind), or a fixed ratio for a video rendered at another rate.
 * Returns the new state and whether it has settled on the target.
 */
export function stepFollowCamera(
  state: CameraState,
  target: CameraTarget,
  viewport: Viewport,
  maxScroll: MaxScroll,
  frames: number
): { state: CameraState; settled: boolean } {
  const ease = (perFrame: number) => 1 - Math.pow(1 - perFrame, frames)
  let settled = true

  let zoom = state.zoom
  if (Math.abs(target.zoom - zoom) > ZOOM_EPSILON) {
    const eased = zoom + (target.zoom - zoom) * ease(0.25)
    zoom = Math.abs(target.zoom - eased) < ZOOM_EPSILON ? target.zoom : eased
    settled = false
  }

  // Scroll against the zoom now in use, clamped to what the content allows,
  // so a target past the edge still settles instead of chasing forever.
  const max = maxScroll(zoom)
  const maxLeft = Math.max(0, max.left)
  const maxTop = Math.max(0, max.top)
  const rx0 = target.x0 * zoom
  const rx1 = target.x1 * zoom
  const ry0 = target.y0 * zoom
  const ry1 = target.y1 * zoom
  const targetLeft = clamp((rx0 + rx1) / 2 - viewport.width / 2, 0, maxLeft)
  const targetTop = clamp((ry0 + ry1) / 2 - viewport.height / 2, 0, maxTop)

  let { scrollLeft, scrollTop } = state
  const dLeft = targetLeft - scrollLeft
  const dTop = targetTop - scrollTop
  if (Math.abs(dLeft) > SCROLL_EPSILON || Math.abs(dTop) > SCROLL_EPSILON) {
    scrollLeft += Math.abs(dLeft) < 1 ? dLeft : dLeft * ease(0.35)
    scrollTop += Math.abs(dTop) < 1 ? dTop : dTop * ease(0.35)
    settled = false
  }

  const snapped = snapIntoView({ zoom, scrollLeft, scrollTop }, target, viewport)
  return {
    state: {
      zoom,
      scrollLeft: clamp(snapped.scrollLeft, 0, maxLeft),
      scrollTop: clamp(snapped.scrollTop, 0, maxTop)
    },
    settled
  }
}

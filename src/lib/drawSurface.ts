/**
 * Drawing surface — the thin seam that lets one renderer paint to several
 * outputs.
 *
 * The timing chart has to appear in three places: the canvas on screen, the
 * frames fed to the MP4 encoder, and the vector chart embedded in the PDF
 * report. Rather than keep three copies of the drawing code in step, the
 * renderer draws against this interface and each output supplies a backend.
 *
 * The API is deliberately tiny — the chart is only ever rectangles, hairlines
 * and short labels. Anything richer belongs in the caller, not here.
 */

export interface RectStyle {
  fill?: string
  stroke?: string
  lineWidth?: number
}

export interface TextStyle {
  fill: string
  fontSize: number
  fontFamily: string
  align?: 'left' | 'center'
  /**
   * Outline colour drawn behind the glyphs so a label stays readable over any
   * cell fill. A real outline rather than an offset copy: the offset trick
   * reads fine at 10px on screen but turns into a visible double image once
   * the vector chart is scaled up for an A3 print.
   */
  halo?: string
  haloWidth?: number
}

export interface DrawSurface {
  rect(x: number, y: number, w: number, h: number, style: RectStyle): void
  line(x1: number, y1: number, x2: number, y2: number, stroke: string, lineWidth: number): void
  /** `y` is the vertical centre of the text, matching canvas textBaseline 'middle'. */
  text(content: string, x: number, y: number, style: TextStyle): void
}

/** Backend for the on-screen canvas and for MP4 frame rendering. */
export class CanvasSurface implements DrawSurface {
  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  rect(x: number, y: number, w: number, h: number, style: RectStyle): void {
    if (style.fill) {
      this.ctx.fillStyle = style.fill
      this.ctx.fillRect(x, y, w, h)
    }
    if (style.stroke) {
      this.ctx.strokeStyle = style.stroke
      this.ctx.lineWidth = style.lineWidth ?? 1
      this.ctx.strokeRect(x, y, w, h)
    }
  }

  line(x1: number, y1: number, x2: number, y2: number, stroke: string, lineWidth: number): void {
    this.ctx.strokeStyle = stroke
    this.ctx.lineWidth = lineWidth
    this.ctx.beginPath()
    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(x2, y2)
    this.ctx.stroke()
  }

  text(content: string, x: number, y: number, style: TextStyle): void {
    this.ctx.font = `${style.fontSize}px ${style.fontFamily}`
    this.ctx.textAlign = style.align ?? 'left'
    this.ctx.textBaseline = 'middle'
    if (style.halo) {
      this.ctx.strokeStyle = style.halo
      this.ctx.lineWidth = style.haloWidth ?? 2
      this.ctx.lineJoin = 'round'
      this.ctx.miterLimit = 2
      this.ctx.strokeText(content, x, y)
    }
    this.ctx.fillStyle = style.fill
    this.ctx.fillText(content, x, y)
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Number formatting: trims the float noise that would bloat the SVG. */
const n = (value: number): string => {
  const rounded = Math.round(value * 100) / 100
  return String(rounded)
}

/**
 * Backend that emits SVG markup, used for the PDF report. Vector output is the
 * whole reason the report beats a PNG: an A3 print of a 60-column chart stays
 * readable, and the labels remain selectable and searchable in the PDF.
 */
export class SvgSurface implements DrawSurface {
  private readonly parts: string[] = []

  constructor(
    private readonly width: number,
    private readonly height: number
  ) {}

  rect(x: number, y: number, w: number, h: number, style: RectStyle): void {
    if (style.fill) {
      this.parts.push(
        `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${style.fill}"/>`
      )
    }
    if (style.stroke) {
      this.parts.push(
        `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="none" ` +
          `stroke="${style.stroke}" stroke-width="${n(style.lineWidth ?? 1)}"/>`
      )
    }
  }

  line(x1: number, y1: number, x2: number, y2: number, stroke: string, lineWidth: number): void {
    this.parts.push(
      `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" ` +
        `stroke="${stroke}" stroke-width="${n(lineWidth)}"/>`
    )
  }

  text(content: string, x: number, y: number, style: TextStyle): void {
    if (!content) return
    const anchor = style.align === 'center' ? 'middle' : 'start'
    // paint-order puts the stroke under the fill, giving a true outline.
    const halo = style.halo
      ? ` stroke="${style.halo}" stroke-width="${n(style.haloWidth ?? 2)}"` +
        ` stroke-linejoin="round" paint-order="stroke"`
      : ''
    this.parts.push(
      `<text x="${n(x)}" y="${n(y)}" fill="${style.fill}" font-size="${n(style.fontSize)}" ` +
        `font-family="${escapeXml(style.fontFamily)}" text-anchor="${anchor}"${halo} ` +
        `dominant-baseline="central">${escapeXml(content)}</text>`
    )
  }

  toSvg(): string {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(this.width)} ${n(this.height)}" ` +
      `width="${n(this.width)}" height="${n(this.height)}" ` +
      `preserveAspectRatio="xMidYMin meet" shape-rendering="geometricPrecision">` +
      this.parts.join('') +
      `</svg>`
    )
  }
}

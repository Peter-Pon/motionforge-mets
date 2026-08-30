import { ModuleData } from '@/types'
import { RenderConfig, computeContentSize, renderTimingFrameSvg } from '@/lib/canvasRenderer'
import { computeActionStartTimes, computeTotalDurationMs, groupModulesByName } from '@/lib/timingModel'

/**
 * PDF report.
 *
 * The point of the PDF is not "a picture in a wrapper" — PNG already does that.
 * It is the one export that can be handed to somebody who does not have
 * CycleView installed: the chart and the numbers behind it in a single file
 * that cannot be edited, stamped with the project, the cycle time and the date.
 * That is what makes it usable as a design record months later.
 *
 * Rendering goes through Chromium's own print pipeline (see the
 * `pdf:export` handler in the main process) rather than a JS PDF library,
 * because the module names in this domain are routinely Chinese or Japanese.
 * A JS library would need megabytes of embedded CJK font; Chromium just uses
 * the system fonts, and the output stays vector and searchable.
 */

export interface PdfReportLabels {
  chartPage: string
  tablePage: string
  totalCycle: string
  moduleCount: string
  exportedAt: string
  untitledProject: string
  columns: {
    module: string
    action: string
    stage: string
    startPosition: string
    moveCount: string
    intervalTime: string
    startTime: string
    endTime: string
  }
}

export interface PdfReportInput {
  projectName?: string
  modules: ModuleData[]
  config: RenderConfig
  labels: PdfReportLabels
  /** Defaults to now; injectable so the output is reproducible in tests. */
  now?: Date
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "4800" -> "4.80 s / 4800 ms" — both units, because both get quoted. */
function formatCycle(ms: number): string {
  return `${(ms / 1000).toFixed(2)} s / ${Math.round(ms)} ms`
}

interface TableRow {
  module: ModuleData
  startTime: number
  endTime: number
}

/**
 * Flatten the timing model into report rows. The start/end columns are the
 * report's real contribution over the source CSV: the CSV says a module moves
 * 12 cells at 80ms, the report says it runs from 800ms to 1760ms.
 */
export function buildReportRows(modules: ModuleData[]): TableRow[] {
  const byModule = new Map<ModuleData, TableRow>()

  groupModulesByName(modules).forEach(group => {
    const startTimes = computeActionStartTimes(group.modules)
    group.modules.forEach((module, index) => {
      const startTime = startTimes[index]
      byModule.set(module, {
        module,
        startTime,
        endTime: startTime + module.moveCount * module.duration
      })
    })
  })

  // Preserve the on-screen row order rather than the grouping order.
  return modules.map(m => byModule.get(m)).filter((r): r is TableRow => Boolean(r))
}

export interface PdfReportDocument {
  html: string
  headerHtml: string
  footerHtml: string
  fileName: string
}

export function buildPdfReport(input: PdfReportInput): PdfReportDocument {
  const { modules, config, labels } = input
  const now = input.now ?? new Date()
  const projectName = (input.projectName || '').trim() || labels.untitledProject

  const totalMs = computeTotalDurationMs(modules)
  // Tight bounds: a printed page should not be two thirds empty grid.
  const { width, height } = computeContentSize(modules, config.cellWidth, config.cellHeight)

  // The report shows the completed cycle: every track fully coloured. A frozen
  // mid-animation frame would be meaningless on paper.
  const chartSvg = renderTimingFrameSvg({
    modules,
    config,
    width,
    height,
    currentFrame: totalMs
  })

  const rows = buildReportRows(modules)
  const c = labels.columns

  const tableRows = rows
    .map(
      ({ module, startTime, endTime }) => `<tr>
        <td>${escapeHtml(module.moduleName)}</td>
        <td>${escapeHtml(module.actionDescription)}</td>
        <td>${escapeHtml(module.stage || '')}</td>
        <td class="num">${module.calculatedStartX ?? module.startX}</td>
        <td class="num">${module.moveCount}</td>
        <td class="num">${module.duration}</td>
        <td class="num">${Math.round(startTime)}</td>
        <td class="num">${Math.round(endTime)}</td>
      </tr>`
    )
    .join('')

  const meta =
    `${escapeHtml(labels.totalCycle)} ${formatCycle(totalMs)}` +
    ` &nbsp;·&nbsp; ${escapeHtml(labels.moduleCount)} ${modules.length}` +
    ` &nbsp;·&nbsp; ${escapeHtml(labels.exportedAt)} ${formatDate(now)}`

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHtml(projectName)}</title>
<style>
  /* Chromium's own print pipeline lays this out; preferCSSPageSize honours the
     @page box below. The running header and footer are position:fixed, which
     Chromium repeats on every printed page — unlike printToPDF's header/footer
     templates, which collapse to an unreadable 0.75pt whenever the markup uses
     flex, tables or mm units. Only the page number stays in a template. */
  @page { size: A3 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 9mm 0 7mm;
    font: 10pt/1.5 "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB",
          "Noto Sans CJK SC", "Segoe UI", system-ui, sans-serif;
    color: #12161B;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .run-header, .run-footer {
    position: fixed; left: 0; right: 0;
    display: flex; justify-content: space-between; gap: 8mm;
    font-size: 8pt; color: #68707a;
  }
  .run-header { top: 0; padding-bottom: 1.5mm; border-bottom: 1px solid #eceff3; }
  .run-footer { bottom: 0; padding-top: 1.5mm; border-top: 1px solid #eceff3; }
  h2 {
    font-size: 12pt; font-weight: 600; margin: 0 0 4mm;
    padding-bottom: 2mm; border-bottom: 1px solid #d4d9df;
  }
  .chart-page { height: 250mm; display: flex; flex-direction: column;
                page-break-after: always; }
  .chart-frame { flex: 1; min-height: 0; }
  .chart-frame svg { width: 100%; height: 100%; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  thead { display: table-header-group; }
  th, td {
    border: 1px solid #d4d9df; padding: 1.4mm 2mm;
    text-align: left; vertical-align: top;
  }
  th { background: #f3f4f6; font-weight: 600; white-space: nowrap; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  tr { page-break-inside: avoid; }
</style>
</head>
<body>
  <div class="run-header"><span>${escapeHtml(projectName)}</span><span>${meta}</span></div>
  <div class="run-footer"><span>DynMech CycleView · dynmech.com</span><span></span></div>

  <section class="chart-page">
    <h2>${escapeHtml(labels.chartPage)}</h2>
    <div class="chart-frame">${chartSvg}</div>
  </section>
  <section>
    <h2>${escapeHtml(labels.tablePage)}</h2>
    <table>
      <thead>
        <tr>
          <th>${escapeHtml(c.module)}</th>
          <th>${escapeHtml(c.action)}</th>
          <th>${escapeHtml(c.stage)}</th>
          <th>${escapeHtml(c.startPosition)}</th>
          <th>${escapeHtml(c.moveCount)}</th>
          <th>${escapeHtml(c.intervalTime)}</th>
          <th>${escapeHtml(c.startTime)}</th>
          <th>${escapeHtml(c.endTime)}</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </section>
</body>
</html>`

  // Chromium renders these outside the document, without its CSS, and shrinks
  // the whole template to fit if the markup needs a width it cannot resolve.
  // A single right-aligned block div survives that; anything richer does not,
  // so the page number is all that lives here. Everything else is a fixed
  // element inside the document above.
  const headerHtml = '<div></div>'
  const footerHtml =
    `<div style="font:11px 'Segoe UI',system-ui,sans-serif;color:#68707a;` +
    `width:100%;text-align:right;padding-right:34px">` +
    `<span class="pageNumber"></span> / <span class="totalPages"></span></div>`

  const stem = projectName.replace(/[\\/:*?"<>|]+/g, '').trim() || 'cycleview'

  return { html, headerHtml, footerHtml, fileName: `${stem}-timing.pdf` }
}

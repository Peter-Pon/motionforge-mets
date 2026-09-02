import Papa from 'papaparse'
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { ModuleData } from '@/types'

/**
 * Share links for the online edition.
 *
 * The whole CSV travels inside the URL fragment, compressed. Fragments are
 * never sent to the server, so a shared chart stays between the two people
 * exchanging the link: the page is fetched, the data is not. A 70-row table
 * compresses to roughly a kilobyte, well inside what browsers and chat apps
 * accept in a URL.
 */

const HASH_KEY = 'csv='

/** The CSV a share link should carry: the same columns the importer reads. */
export function modulesToCsv(modules: ModuleData[]): string {
  const rows = modules.map(m => ({
    module: m.moduleName,
    stage: m.stage ?? '',
    action: m.actionDescription,
    startPosition: m.startX,
    moveCount: m.moveCount,
    duration: m.duration
  }))
  return Papa.unparse(rows, { header: true, delimiter: ',' })
}

export function buildShareUrl(modules: ModuleData[]): string {
  const payload = compressToEncodedURIComponent(modulesToCsv(modules))
  return `${location.origin}${location.pathname}#${HASH_KEY}${payload}`
}

/** CSV text carried by the current URL, or null when there is none. */
export function readSharedCsv(): string | null {
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash
  if (!hash.startsWith(HASH_KEY)) return null
  try {
    const csv = decompressFromEncodedURIComponent(hash.slice(HASH_KEY.length))
    return csv && csv.trim() ? csv : null
  } catch {
    return null
  }
}

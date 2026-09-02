/// <reference types="vite/client" />

/**
 * Build-time platform switch.
 *
 * The online edition is the same code built with `--mode online` (see
 * vite.web.config.ts and .env.online). It is deliberately a subset of the
 * desktop app: it shows what CycleView does and steers people to the free
 * download for everything that produces output. All of that gating reads
 * from here, so the desktop build has no online code paths active.
 */

export const IS_ONLINE = import.meta.env.VITE_CYCLEVIEW_ONLINE === '1'

/** Rows a CSV may have in the online edition; bigger projects belong on the desktop. */
export const ONLINE_ROW_LIMIT = Number(import.meta.env.VITE_ONLINE_ROW_LIMIT) || 50

const DOWNLOAD_BASE = import.meta.env.VITE_DESKTOP_DOWNLOAD_URL || 'https://www.dynmech.com/download/'

/**
 * Where the "download the desktop app" links go. `placement` names the spot in
 * the UI the click came from (toolbar, export, banner, share) so the download
 * page can tell which prompt converts.
 */
export function desktopDownloadUrl(placement: string): string {
  const url = new URL(DOWNLOAD_BASE)
  url.searchParams.set('ref', 'cycleview-online')
  url.searchParams.set('from', placement)
  return url.toString()
}

/** Commands from the shortcut registry that the online edition does not offer. */
export const ONLINE_DISABLED_COMMANDS = new Set(['preferences', 'undo', 'redo'])

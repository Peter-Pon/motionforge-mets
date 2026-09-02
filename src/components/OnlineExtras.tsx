import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Link2, FolderOpen, X, QrCode } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { useAnimationStore } from '@/stores/useAnimationStore'
import { desktopDownloadUrl, ONLINE_ROW_LIMIT } from '@/lib/platform'
import { buildShareUrl } from '@/lib/shareLink'
import { ModuleData } from '@/types'
import { QrPopover } from '@/components/QrPopover'

/**
 * Everything that exists only in the online edition, in one place.
 *
 * The online build is a preview that points at the free desktop app: these
 * pieces are the download prompts (toolbar, export dialog, end-of-playback
 * banner, shared-link footer) and the two conveniences that make a web page
 * worth visiting at all: sample charts to try, and share links.
 */

const TOOLBAR_BUTTON =
  'inline-flex items-center gap-1.5 px-2.5 h-8 text-sm border rounded transition-colors whitespace-nowrap'

export function DownloadDesktopButton({ placement, className = '' }: { placement: string; className?: string }) {
  const { t } = useTranslation()
  return (
    <a
      href={desktopDownloadUrl(placement)}
      target="_blank"
      rel="noopener noreferrer"
      className={`${TOOLBAR_BUTTON} bg-primary text-primary-foreground border-primary hover:bg-primary/90 ${className}`}
    >
      <Download className="h-3.5 w-3.5" />
      {t('online.downloadDesktop')}
    </a>
  )
}

export function ShareButton({ modules }: { modules: ModuleData[] }) {
  const { t } = useTranslation()
  const disabled = modules.length === 0
  // Anchored to the click, so the code appears where the pointer already is.
  const [qrAt, setQrAt] = useState<{ x: number; y: number } | null>(null)
  const [qrUrl, setQrUrl] = useState('')

  const copy = async () => {
    const url = buildShareUrl(modules)
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: t('online.share'), description: t('online.shareCopied') })
    } catch {
      // Clipboard access can be refused (insecure context, permissions); the
      // address bar is the fallback the user can copy from.
      history.replaceState(null, '', url)
      toast({ title: t('online.share'), description: t('online.shareFallback') })
    }
  }

  const showQr = (e: React.MouseEvent) => {
    setQrUrl(buildShareUrl(modules))
    setQrAt({ x: e.clientX, y: e.clientY })
  }

  return (
    <>
      {/* One control, two actions: copy is the common case, the QR is for
          getting the chart onto a phone standing at the machine. */}
      <div className="inline-flex">
        <button
          onClick={copy}
          disabled={disabled}
          className={`${TOOLBAR_BUTTON} rounded-r-none border-r-0 hover:bg-accent disabled:opacity-50`}
          title={t('online.share')}
        >
          <Link2 className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">{t('online.share')}</span>
        </button>
        <button
          onClick={showQr}
          disabled={disabled}
          className={`${TOOLBAR_BUTTON} rounded-l-none px-2 hover:bg-accent disabled:opacity-50`}
          title={t('online.qrTitle')}
          aria-label={t('online.qrTitle')}
        >
          <QrCode className="h-3.5 w-3.5" />
        </button>
      </div>
      {qrAt && <QrPopover url={qrUrl} anchor={qrAt} onClose={() => setQrAt(null)} />}
    </>
  )
}

// Sample charts shipped with the repository, bundled as text so the online
// edition needs no extra requests. Files over the row limit and the
// deliberately broken one are left out.
const SAMPLE_FILES = import.meta.glob('../../sample-data/*.csv', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

const SAMPLES = Object.entries(SAMPLE_FILES)
  .map(([path, csv]) => ({ name: path.split('/').pop()!.replace(/\.csv$/, ''), csv }))
  .filter(({ name, csv }) => name !== 'test-with-errors' && csv.trim().split(/\r?\n/).length - 1 <= ONLINE_ROW_LIMIT)
  .sort((a, b) => a.name.localeCompare(b.name))

export function SampleGalleryButton({ onPick }: { onPick: (csv: string, name: string) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`${TOOLBAR_BUTTON} hover:bg-accent`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t('online.samples')}
      >
        <FolderOpen className="h-3.5 w-3.5" />
        <span className="hidden xl:inline">{t('online.samples')}</span>
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full mt-1 z-50 min-w-[14rem] bg-background border rounded shadow-lg py-1">
          {SAMPLES.map(sample => (
            <button
              key={sample.name}
              role="menuitem"
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
              onClick={() => {
                setOpen(false)
                onPick(sample.csv, sample.name)
              }}
            >
              {sample.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Shown in the export dialog instead of the exporters. */
export function DesktopOnlyExport({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg shadow-xl p-6 w-96 max-w-[90vw]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{t('online.exportTitle')}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl" aria-label={t('dialog.cancel')}>
            ×
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">{t('online.exportBody')}</p>
        <ul className="text-sm text-gray-800 space-y-1 mb-5 list-disc list-inside">
          <li>{t('menu.file.export.mp4')}</li>
          <li>{t('menu.file.export.pdf')}</li>
          <li>{t('menu.file.export.csv')}</li>
        </ul>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            {t('dialog.cancel')}
          </button>
          <DownloadDesktopButton placement="export" />
        </div>
      </div>
    </div>
  )
}

/**
 * Over the canvas once a cycle has played to the end: the moment the follow
 * camera has just finished making its case.
 */
export function PlaybackEndBanner() {
  const { t } = useTranslation()
  const { currentFrame, totalFrames, isPlaying, loop } = useAnimationStore()
  const [dismissed, setDismissed] = useState(false)
  const finished = totalFrames > 0 && !isPlaying && !loop && currentFrame >= totalFrames

  // Show again for the next full run.
  useEffect(() => {
    if (currentFrame === 0) setDismissed(false)
  }, [currentFrame])

  if (!finished || dismissed) return null
  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-4 z-20 max-w-[90%] flex items-center gap-3 bg-[#12161B] text-[#FAF9F7] rounded-lg shadow-lg px-4 py-2.5 text-sm">
      <span>{t('online.banner')}</span>
      <DownloadDesktopButton placement="banner" className="h-7 px-2" />
      <button onClick={() => setDismissed(true)} className="text-[#FAF9F7]/70 hover:text-[#FAF9F7]" aria-label={t('online.dismiss')}>
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

/** Fixed strip at the bottom when the page was opened from a share link. */
export function SharedFooter() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center gap-3 border-t bg-[#12161B] text-[#FAF9F7] text-sm px-4 py-2">
      <span>{t('online.sharedFooter')}</span>
      <DownloadDesktopButton placement="share" className="h-7 px-2" />
    </div>
  )
}

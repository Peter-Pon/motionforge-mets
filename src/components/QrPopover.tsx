import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, X } from 'lucide-react'
import QRCode from 'qrcode'

/**
 * A QR code for the share link, shown next to the pointer.
 *
 * Phones are the reason this exists: a share link is long (the whole CSV rides
 * in the fragment), so retyping it is hopeless and pasting it into a phone is
 * awkward. Pointing a camera at the screen is the shortest path from "this
 * chart" to "this chart, on the machine next to the line".
 *
 * The code is generated in the browser from the same URL the copy button puts
 * on the clipboard — no request, so the CSV in the fragment stays local.
 */

/** Rendered at 2x so the downloaded PNG stays sharp when printed or scaled. */
const RENDER_PX = 512
const DISPLAY_PX = 208
const MARGIN = 12

/** Byte capacity of the largest QR symbol (version 40) at error-correction L.
 *  A share URL carries the whole CSV, so a big enough chart genuinely cannot be
 *  encoded — say so plainly instead of reporting a mystery failure. */
const QR_MAX_CHARS = 3000

export function QrPopover({
  url,
  anchor,
  onClose
}: {
  url: string
  anchor: { x: number; y: number }
  onClose: () => void
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState<'generic' | 'too-long' | null>(null)
  const [pos, setPos] = useState(anchor)

  useEffect(() => {
    let alive = true
    if (url.length > QR_MAX_CHARS) {
      setFailed('too-long')
      return
    }
    QRCode.toDataURL(url, {
      width: RENDER_PX,
      margin: 1,
      errorCorrectionLevel: 'L', // share URLs are long; L keeps the modules readable
      color: { dark: '#12161BFF', light: '#FFFFFFFF' }
    })
      .then(d => alive && setDataUrl(d))
      .catch(() => alive && setFailed('generic'))
    return () => {
      alive = false
    }
  }, [url])

  // Keep the card inside the viewport: flip to the other side of the pointer
  // when it would overflow rather than letting it run off-screen.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    let x = anchor.x + MARGIN
    let y = anchor.y + MARGIN
    if (x + width > window.innerWidth - MARGIN) x = anchor.x - width - MARGIN
    if (y + height > window.innerHeight - MARGIN) y = anchor.y - height - MARGIN
    setPos({ x: Math.max(MARGIN, x), y: Math.max(MARGIN, y) })
  }, [anchor, dataUrl, failed])

  // Dismiss on outside click, Escape, or scroll — the card is anchored to a
  // pointer position that stops meaning anything once the page moves.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  const download = () => {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'cycleview-share-qr.png'
    a.click()
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={t('online.qrTitle')}
      className="fixed z-[60] w-[248px] rounded-lg border bg-background shadow-xl p-3"
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{t('online.qrTitle')}</span>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground rounded p-0.5"
          aria-label={t('online.dismiss')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        className="flex items-center justify-center rounded bg-white"
        style={{ height: DISPLAY_PX }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            width={DISPLAY_PX}
            height={DISPLAY_PX}
            alt={t('online.qrAlt')}
            className="block"
          />
        ) : (
          <span className="px-4 text-center text-xs text-muted-foreground">
            {failed === 'too-long'
              ? t('online.qrTooLong')
              : failed === 'generic'
                ? t('online.qrFailed')
                : '…'}
          </span>
        )}
      </div>

      {!failed && <p className="mt-2 text-xs text-muted-foreground leading-snug">{t('online.qrHint')}</p>}

      <button
        onClick={download}
        disabled={!dataUrl}
        className="mt-2 w-full inline-flex items-center justify-center gap-1.5 h-8 text-sm border rounded hover:bg-accent disabled:opacity-50 transition-colors"
      >
        <Download className="h-3.5 w-3.5" />
        {t('online.qrDownload')}
      </button>
    </div>
  )
}

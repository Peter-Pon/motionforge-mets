import { useTranslation } from 'react-i18next'
import { ONLINE_ROW_LIMIT } from '@/lib/platform'
import { DownloadDesktopButton } from '@/components/OnlineExtras'
import { LanguageSelector } from '@/components/LanguageSelector'
import { DropdownMenu } from '@/components/DropdownMenu'

/**
 * Top bar for the online edition.
 *
 * The desktop app has a native menu bar and a window title, so the user always
 * knows what they are looking at. In a browser tab there is nothing: the old
 * layout opened straight onto a toolbar of unlabelled icons, with the product
 * name nowhere on the page. This is the strip that says what this is, marks it
 * as the online edition, and keeps the one conversion action visible.
 *
 * The convention it follows is the ordinary one: identity on the left, primary
 * call to action on the right, secondary utilities beside it, and the working
 * toolbar left alone underneath. Nav and tools stay separate rows because they
 * answer different questions — "what is this" versus "what do I do now".
 */
export function OnlineNavbar({
  onAbout,
  onShortcuts,
  onUserGuide
}: {
  onAbout: () => void
  onShortcuts: () => void
  onUserGuide: () => void
}) {
  const { t } = useTranslation()

  return (
    <header className="border-b bg-background">
      <div className="flex items-center justify-between gap-4 px-4 h-14">
        {/* Identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <svg viewBox="0 0 120 120" className="h-7 w-7 flex-shrink-0" aria-hidden="true">
            <g transform="translate(60 60) scale(1.143) translate(-57.5 -74.95)">
              <path d="M96 96 A72 72 0 0 0 86.4 60" fill="none" stroke="#1F5FE8" strokeWidth="14" />
              <rect x="12" y="84" width="24" height="24" fill="currentColor" />
              <path d="M24 96 L77.5 47.8" fill="none" stroke="currentColor" strokeWidth="16" />
              <circle cx="24" cy="96" r="4.5" fill="#FAF9F7" />
            </g>
          </svg>
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-semibold tracking-tight truncate">
              DYNMECH <span className="font-normal">CycleView</span>
            </span>
            {/* Says plainly that this is the preview, not the full product —
                the row cap below is the honest version of the same message. */}
            <span className="hidden sm:inline text-[11px] uppercase tracking-wider text-muted-foreground border rounded-full px-2 py-0.5 flex-shrink-0">
              {t('online.editionBadge')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden lg:inline text-xs text-muted-foreground">
            {t('online.navLimit', { limit: ONLINE_ROW_LIMIT })}
          </span>
          <DownloadDesktopButton placement="navbar" />
          <DropdownMenu onAbout={onAbout} onShortcuts={onShortcuts} onUserGuide={onUserGuide} />
          <LanguageSelector />
        </div>
      </div>
    </header>
  )
}

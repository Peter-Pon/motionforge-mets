import { app } from 'electron'
import zhTW from '../src/locales/zh-TW/common.json'
import zhCN from '../src/locales/zh-CN/common.json'
import en from '../src/locales/en/common.json'
import ja from '../src/locales/ja/common.json'
import ko from '../src/locales/ko/common.json'

/**
 * Main-process translations for the application menu.
 *
 * The locale files are bundled in at build time (vite handles the JSON
 * imports) rather than read from disk: `src/locales` is not part of the
 * packaged app, so a runtime readFile would silently fall back to the raw
 * keys in production.
 *
 * The renderer owns the UI language (i18next + localStorage). It cannot be
 * read from here before the window exists, so the menu starts from the OS
 * locale and the renderer pushes its actual language over IPC once it has
 * booted, and again whenever the user changes it.
 */

export type Language = 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'ko'

const TRANSLATIONS: Record<Language, Record<string, unknown>> = {
  'zh-TW': zhTW,
  'zh-CN': zhCN,
  en,
  ja,
  ko
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && value in TRANSLATIONS
}

/** Map an OS locale to one of the five shipped languages, English otherwise. */
export function languageFromLocale(locale: string): Language {
  const lower = locale.toLowerCase()
  if (lower.startsWith('zh')) {
    return /(^|-)(tw|hk|mo|hant)(-|$)/.test(lower) ? 'zh-TW' : 'zh-CN'
  }
  if (lower.startsWith('ja')) return 'ja'
  if (lower.startsWith('ko')) return 'ko'
  return 'en'
}

class I18nManager {
  private currentLanguage: Language | null = null

  getLanguage(): Language {
    // Resolved lazily: app.getLocale() is only meaningful once the app is ready.
    if (!this.currentLanguage) {
      this.currentLanguage = languageFromLocale(app.getLocale())
    }
    return this.currentLanguage
  }

  /** Returns true when the language actually changed. */
  setLanguage(language: string): boolean {
    if (!isLanguage(language)) return false
    const changed = language !== this.currentLanguage
    this.currentLanguage = language
    return changed
  }

  t(key: string): string {
    let value: unknown = TRANSLATIONS[this.getLanguage()]
    for (const part of key.split('.')) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part]
      } else {
        return key
      }
    }
    return typeof value === 'string' ? value : key
  }
}

export const i18n = new I18nManager()

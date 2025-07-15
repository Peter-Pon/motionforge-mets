import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translations
import zhTW from '../locales/zh-TW/common.json'
import zhCN from '../locales/zh-CN/common.json'
import en from '../locales/en/common.json'
import ja from '../locales/ja/common.json'

export const defaultNS = 'common'
export const resources = {
  'zh-TW': {
    common: zhTW
  },
  'zh-CN': {
    common: zhCN
  },
  en: {
    common: en
  },
  ja: {
    common: ja
  }
} as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'zh-TW',
    defaultNS,
    resources,
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false // React already escapes
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  })

export default i18n
import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

export class I18nManager {
  private currentLanguage: string = 'zh-TW'
  private translations: Record<string, any> = {}

  constructor() {
    this.loadTranslations()
  }

  private loadTranslations() {
    const languages = ['zh-TW', 'zh-CN', 'en', 'ja']
    
    languages.forEach(lang => {
      try {
        const filePath = path.join(__dirname, `../src/locales/${lang}/common.json`)
        if (fs.existsSync(filePath)) {
          this.translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        }
      } catch (error) {
        console.error(`Failed to load translation for ${lang}:`, error)
      }
    })
  }

  setLanguage(language: string) {
    if (this.translations[language]) {
      this.currentLanguage = language
    }
  }

  t(key: string): string {
    const keys = key.split('.')
    let value = this.translations[this.currentLanguage]
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k]
      } else {
        return key // Return key if translation not found
      }
    }
    
    return typeof value === 'string' ? value : key
  }

  getCurrentLanguage(): string {
    return this.currentLanguage
  }
}

export const i18n = new I18nManager()
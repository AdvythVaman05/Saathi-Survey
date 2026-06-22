import { create } from 'zustand'
import type { LanguageCode } from '../types'
import { translations, type TranslationKey } from '../translations'

export const SUPPORTED_LANGUAGES = [
  { code: 'en' as const, label: 'English', nativeLabel: 'English' },
  { code: 'hi' as const, label: 'Hindi', nativeLabel: 'हिन्दी' }
]

interface LanguageState {
  language: LanguageCode | null
  setLanguage: (lang: LanguageCode) => void
  getTranslation: (key: TranslationKey) => string
  getVoiceLocale: () => string
  resetLanguage: () => void
}

function getRecoveredLanguage(): LanguageCode | null {
  const recovered = localStorage.getItem('vsurvey_recovered_language')
  return SUPPORTED_LANGUAGES.some(({ code }) => code === recovered)
    ? recovered as LanguageCode
    : null
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: getRecoveredLanguage(),

  setLanguage: (language) => {
    set({ language })
    // Save to local storage for recovery
    localStorage.setItem('vsurvey_recovered_language', language)
  },

  getTranslation: (key) => {
    const { language } = get()
    const currentLang = language || 'en'
    const dict = (translations[currentLang] || translations['en']) as Record<string, string>
    return dict[key] || (translations['en'] as Record<string, string>)[key] || ''
  },

  getVoiceLocale: () => {
    const { language } = get()
    switch (language) {
      case 'hi':
      case 'hinglish':
        return 'hi-IN'
      case 'mr':
        return 'mr-IN'
      case 'te':
        return 'te-IN'
      case 'ta':
        return 'ta-IN'
      case 'kn':
        return 'kn-IN'
      case 'en':
      default:
        return 'en-IN' // Use Indian English voice as standard for Saathi Survey context
    }
  },

  resetLanguage: () => {
    localStorage.removeItem('vsurvey_recovered_language')
    set({ language: null })
  }
}))

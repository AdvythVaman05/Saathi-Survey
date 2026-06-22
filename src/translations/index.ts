import { en } from './en'
import { hi } from './hi'
import { hinglish } from './hinglish'
import { mr } from './mr'
import { te } from './te'
import { ta } from './ta'
import { kn } from './kn'

export const translations = {
  en,
  hi,
  hinglish,
  mr,
  te,
  ta,
  kn
}

export type TranslationKey = keyof typeof en
export type TranslationDict = typeof en
export type SupportedLanguages = keyof typeof translations

import { BrowserSpeechProvider } from './browserStt'
import { BrowserTTSProvider } from './browserTts'
import { SarvamSpeechProvider } from './sarvamStt'
import { SarvamTTSProvider } from './sarvamTts'
import type { SpeechProvider, TTSProvider } from './provider'

const sarvamApiKey = import.meta.env.VITE_SARVAM_API_KEY as string | undefined
const requestedStt = (import.meta.env.VITE_STT_PROVIDER as string | undefined)?.toLowerCase()
const requestedTts = (import.meta.env.VITE_TTS_PROVIDER as string | undefined)?.toLowerCase()

function isSarvamConfigured(): boolean {
  return !!(sarvamApiKey && !sarvamApiKey.includes('your-') && sarvamApiKey.trim() !== '')
}

export function getSpeechProvider(): SpeechProvider {
  if (requestedStt !== 'browser' && isSarvamConfigured()) {
    return new SarvamSpeechProvider(sarvamApiKey!)
  }
  return new BrowserSpeechProvider()
}

export function getTTSProvider(): TTSProvider {
  if (requestedTts !== 'browser' && isSarvamConfigured()) {
    return new SarvamTTSProvider(sarvamApiKey!)
  }
  return new BrowserTTSProvider()
}

export function getProviderNames(): { stt: string; tts: string } {
  const configured = isSarvamConfigured()
  return {
    stt: requestedStt !== 'browser' && configured ? 'SARVAM' : 'BROWSER',
    tts: requestedTts !== 'browser' && configured ? 'SARVAM' : 'BROWSER'
  }
}

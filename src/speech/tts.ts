export interface SpeakOptions {
  lang: string
  rate?: number
  pitch?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: (err: string) => void
}

let activeUtterance: SpeechSynthesisUtterance | null = null

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function cancelSpeech(): void {
  if (!isSpeechSynthesisSupported()) return
  
  if (activeUtterance) {
    activeUtterance.onstart = null
    activeUtterance.onend = null
    activeUtterance.onerror = null
    activeUtterance = null
  }
  
  window.speechSynthesis.cancel()
}

export function speak(text: string, options: SpeakOptions): Promise<void> {
  return new Promise((resolve) => {
    if (!isSpeechSynthesisSupported()) {
      options.onError?.('Speech synthesis not supported in this browser.')
      resolve()
      return
    }

    cancelSpeech()

    const { lang, rate = 0.95, pitch = 1 } = options
    const utterance = new SpeechSynthesisUtterance(text)
    activeUtterance = utterance
    
    utterance.rate = rate
    utterance.pitch = pitch
    
    // Choose appropriate voice
    const voices = window.speechSynthesis.getVoices()
    const normalizedLang = lang.toLowerCase()
    const baseLanguage = normalizedLang.split('-')[0]
    let voice = voices.find((v) => v.lang.toLowerCase() === normalizedLang)
      || voices.find((v) => v.lang.toLowerCase().startsWith(`${baseLanguage}-`))
    
    // Fallback for Hinglish (usually sounds best with English India or Hindi India voices)
    if (!voice && lang === 'hinglish') {
      voice = voices.find((v) => v.lang.includes('en-IN') || v.lang.includes('hi-IN'))
    }
    
    if (voice) {
      utterance.voice = voice
    }
    utterance.lang = voice ? voice.lang : lang

    utterance.onstart = () => {
      options.onStart?.()
    }

    utterance.onend = () => {
      activeUtterance = null
      options.onEnd?.()
      resolve()
    }

    utterance.onerror = (event) => {
      activeUtterance = null
      
      // 'interrupted' is expected when user presses Skip or Repeat, it's not a true system crash
      if (event.error !== 'interrupted' && options.onError) {
        options.onError?.(`Speech synthesis error: ${event.error}`)
      } else if (event.error !== 'interrupted') {
        options.onEnd?.()
      }
      resolve()
    }

    window.speechSynthesis.speak(utterance)
  })
}

export function isSpeaking(): boolean {
  return isSpeechSynthesisSupported() && window.speechSynthesis.speaking
}

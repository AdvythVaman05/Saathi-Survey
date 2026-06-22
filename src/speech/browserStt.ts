import type { SpeechProvider } from './provider'

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onaudiostart: (() => void) | null
  onaudioend: (() => void) | null
  onsoundstart: (() => void) | null
  onsoundend: (() => void) | null
  onspeechstart: (() => void) | null
  onspeechend: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

declare global {
  interface Window {
    SpeechRecognition?: {
      new (): ISpeechRecognition
    }
    webkitSpeechRecognition?: {
      new (): ISpeechRecognition
    }
  }
}

export class BrowserSpeechProvider implements SpeechProvider {
  private recognition: ISpeechRecognition | null = null

  startListening(options: {
    lang: string
    onResult: (transcript: string, isFinal: boolean) => void
    onError: (error: string) => void
    onEnd?: () => void
  }) {
    if (this.recognition) {
      this.stopListening()
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionClass) {
      options.onError('Web Speech Recognition API is not supported in this browser.')
      return
    }

    try {
      const recognitionInstance = new SpeechRecognitionClass()
      this.recognition = recognitionInstance
      
      recognitionInstance.continuous = false
      recognitionInstance.interimResults = true
      recognitionInstance.lang = options.lang
      recognitionInstance.maxAlternatives = 1

      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          } else {
            interimTranscript += result[0].transcript
          }
        }

        if (finalTranscript.trim().length > 0) {
          options.onResult(finalTranscript.trim(), true)
        } else if (interimTranscript.trim().length > 0) {
          options.onResult(interimTranscript.trim(), false)
        }
      }

      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'no-speech') {
          options.onResult('', true)
          return
        }
        
        if (event.error === 'aborted') {
          return 
        }

        options.onError(`Speech recognition error: ${event.error}`)
      }

      recognitionInstance.onend = () => {
        if (this.recognition !== recognitionInstance) return
        this.recognition = null
        if (options.onEnd) {
          options.onEnd()
        }
      }

      recognitionInstance.start()
    } catch (err) {
      options.onError(err instanceof Error ? err.message : 'Failed to start speech recognition')
    }
  }

  stopListening() {
    if (this.recognition) {
      const recognition = this.recognition
      this.recognition = null
      try {
        recognition.onend = null
        recognition.onerror = null
        recognition.onresult = null
        recognition.stop()
      } catch (err) {
        // Ignore stopped exceptions
      }
    }
  }
}

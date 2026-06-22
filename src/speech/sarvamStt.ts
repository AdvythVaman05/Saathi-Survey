import type { SpeechProvider } from './provider'
import { BrowserSpeechProvider } from './browserStt'
import { audioRecorder } from '../audio/recorder'

export class SarvamSpeechProvider implements SpeechProvider {
  private browserProvider = new BrowserSpeechProvider()
  private apiKey: string
  private lastBlob: Blob | null = null
  private lastMimeType: string = 'audio/webm'
  private isListeningActive = false
  private sessionId = 0

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  startListening(options: {
    lang: string
    onResult: (transcript: string, isFinal: boolean) => void
    onError: (error: string) => void
    onEnd?: () => void
  }) {
    this.lastBlob = null
    this.isListeningActive = true
    const sessionId = ++this.sessionId
    let finalizing = false

    // Start audio recorder in parallel
    audioRecorder.start().catch((err) => {
      console.warn('Sarvam STT failed to start audioRecorder:', err)
    })

    // Start browser speech recognition for silence detection & interim text
    this.browserProvider.startListening({
      lang: options.lang,
      onResult: async (transcript, isFinal) => {
        if (!this.isListeningActive || sessionId !== this.sessionId) return

        if (!isFinal) {
          // Pass interim results directly to page for real-time visual feedback
          options.onResult(transcript, false)
        } else {
          finalizing = true
          // Silence detected by browser. Stop recording and process high-fidelity STT
          options.onResult(transcript, false) // show last interim transcript
          
          try {
            if (audioRecorder.isRecording()) {
              const audio = await audioRecorder.stop()
              this.lastBlob = audio.blob
              this.lastMimeType = audio.mimeType
            }

            if (this.lastBlob) {
              options.onResult(transcript, false) // keep showing original transcript while processing
              
              const sarvamLang = this.mapLanguageCode(options.lang)
              const formData = new FormData()
              
              const ext = this.lastMimeType.includes('wav') ? 'wav' : 'webm'
              formData.append('file', this.lastBlob, `speech.${ext}`)
              formData.append('model', 'saaras:v3')
              formData.append('language_code', sarvamLang)
              
              const res = await fetch('https://api.sarvam.ai/speech-to-text', {
                method: 'POST',
                headers: {
                  'api-subscription-key': this.apiKey
                },
                body: formData
              })

              if (!res.ok) {
                throw new Error(`Sarvam STT API returned ${res.status}: ${res.statusText}`)
              }

              const data = await res.json()
              if (!this.isListeningActive || sessionId !== this.sessionId) return
              if (data.transcript && data.transcript.trim()) {
                options.onResult(data.transcript.trim(), true)
              } else {
                throw new Error('Sarvam STT returned empty transcript')
              }
            } else {
              options.onResult(transcript, true)
            }
          } catch (err) {
            if (!this.isListeningActive || sessionId !== this.sessionId) return
            console.warn('Sarvam STT failed, falling back to Browser STT transcript:', err)
            options.onResult(transcript, true)
          } finally {
            if (this.isListeningActive && sessionId === this.sessionId) options.onEnd?.()
          }
        }
      },
      onError: (error) => {
        if (this.isListeningActive) {
          options.onError(error)
        }
      },
      onEnd: () => {
        if (!finalizing && this.isListeningActive && sessionId === this.sessionId) options.onEnd?.()
      }
    })
  }

  stopListening() {
    this.isListeningActive = false
    this.sessionId++
    this.browserProvider.stopListening()
    if (audioRecorder.isRecording()) {
      audioRecorder.stop().catch(() => {})
    }
  }

  getLastAudioBlob(): Blob | null {
    return this.lastBlob
  }

  getLastMimeType(): string {
    return this.lastMimeType
  }

  private mapLanguageCode(lang: string): string {
    const clean = lang.toLowerCase().split('-')[0]
    switch (clean) {
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
        return 'en-IN'
    }
  }
}

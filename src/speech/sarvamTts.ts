import type { TTSProvider, SpeakOptions } from './provider'
import { BrowserTTSProvider } from './browserTts'

export class SarvamTTSProvider implements TTSProvider {
  private activeAudio: HTMLAudioElement | null = null
  private activeAudioUrl: string | null = null
  private fallbackProvider = new BrowserTTSProvider()
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
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

  private getSpeaker(lang: string): string {
    const mapped = this.mapLanguageCode(lang)
    switch (mapped) {
      case 'en-IN':
        return 'ishita'
      case 'hi-IN':
      case 'te-IN':
      case 'mr-IN':
        return 'priya'
      case 'ta-IN':
        return 'ritu'
      case 'kn-IN':
        return 'ishita'
      default:
        return 'anushka'
    }
  }

  async speak(text: string, options: SpeakOptions): Promise<void> {
    this.cancel()

    const targetLang = this.mapLanguageCode(options.lang)
    const speaker = this.getSpeaker(options.lang)

    try {
      options.onStart?.()
      
      const response = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'api-subscription-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          target_language_code: targetLang,
          speaker,
          model: 'bulbul:v3'
        })
      })

      if (!response.ok) {
        throw new Error(`Sarvam TTS request failed: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.audios || data.audios.length === 0) {
        throw new Error('Sarvam TTS returned no audio data')
      }

      const base64Audio = data.audios[0]
      const binaryString = window.atob(base64Audio)
      const len = binaryString.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const audioBlob = new Blob([bytes], { type: 'audio/wav' })
      const audioUrl = URL.createObjectURL(audioBlob)

      const audio = new Audio(audioUrl)
      this.activeAudio = audio
      this.activeAudioUrl = audioUrl

      // Apply rate (HTML5 Audio playbackRate)
      if (options.rate) {
        audio.playbackRate = options.rate
      }

      return new Promise<void>((resolve) => {
        audio.onended = () => {
          this.activeAudio = null
          this.activeAudioUrl = null
          URL.revokeObjectURL(audioUrl)
          options.onEnd?.()
          resolve()
        }

        audio.onerror = (e) => {
          console.warn('Sarvam audio playback error, falling back to browser TTS', e)
          this.activeAudio = null
          this.activeAudioUrl = null
          URL.revokeObjectURL(audioUrl)
          // Fallback
          this.fallbackProvider.speak(text, options).then(resolve)
        }

        audio.play().catch((err) => {
          console.warn('Failed to play Sarvam audio, falling back to browser TTS', err)
          this.activeAudio = null
          this.activeAudioUrl = null
          URL.revokeObjectURL(audioUrl)
          // Fallback
          this.fallbackProvider.speak(text, options).then(resolve)
        })
      })

    } catch (error) {
      console.warn('Sarvam TTS API failed, falling back to Browser TTS:', error)
      // Fallback to browser TTS
      await this.fallbackProvider.speak(text, options)
    }
  }

  cancel(): void {
    if (this.activeAudio) {
      this.activeAudio.pause()
      this.activeAudio = null
    }
    if (this.activeAudioUrl) {
      URL.revokeObjectURL(this.activeAudioUrl)
      this.activeAudioUrl = null
    }
    this.fallbackProvider.cancel()
  }

  isSpeaking(): boolean {
    if (this.activeAudio) {
      return !this.activeAudio.paused && !this.activeAudio.ended
    }
    return this.fallbackProvider.isSpeaking()
  }
}

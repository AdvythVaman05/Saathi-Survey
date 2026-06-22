import type { TTSProvider, SpeakOptions } from './provider'
import { speak, cancelSpeech, isSpeaking } from './tts'

export class BrowserTTSProvider implements TTSProvider {
  async speak(text: string, options: SpeakOptions): Promise<void> {
    await speak(text, options)
  }

  cancel(): void {
    cancelSpeech()
  }

  isSpeaking(): boolean {
    return isSpeaking()
  }
}

export interface SpeakOptions {
  lang: string
  rate?: number
  pitch?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: (err: string) => void
}

export interface SpeechProvider {
  startListening: (options: {
    lang: string
    onResult: (transcript: string, isFinal: boolean) => void
    onError: (error: string) => void
    onEnd?: () => void
  }) => void
  stopListening: () => void
}

export interface TTSProvider {
  speak: (text: string, options: SpeakOptions) => Promise<void>
  cancel: () => void
  isSpeaking: () => boolean
}

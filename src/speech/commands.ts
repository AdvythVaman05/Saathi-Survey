export type VoiceCommand = 'next' | 'back' | 'repeat' | 'skip' | 'pause' | 'resume' | 'submit'

const COMMAND_DICTIONARY: Record<VoiceCommand, string[]> = {
  next: ['next', 'continue', 'go forward', 'move on'],
  back: ['back', 'previous', 'go back'],
  repeat: ['repeat', 'say again', 'read again', 'hear again'],
  skip: ['skip', 'bypass'],
  pause: ['pause', 'stop listening', 'hold'],
  resume: ['resume', 'start listening', 'continue listening'],
  submit: ['submit', 'finish', 'done', 'complete survey']
}

export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  const normalized = transcript.trim().toLowerCase()
  if (!normalized) return null

  for (const [command, phrases] of Object.entries(COMMAND_DICTIONARY) as [VoiceCommand, string[]][]) {
    for (const phrase of phrases) {
      const lowerPhrase = phrase.toLowerCase()
      if (normalized === lowerPhrase || new RegExp(`\\b${lowerPhrase}\\b`, 'i').test(normalized)) {
        return command
      }
    }
  }

  return null
}

export function isCommandOnly(transcript: string): boolean {
  return parseVoiceCommand(transcript) !== null
}

export function matchYesNo(transcript: string): 'yes' | 'no' | null {
  const clean = transcript.trim().toLowerCase().replace(/[.,!?]/g, '')
  const yesTerms = ['yes', 'yeah', 'yep', 'haan', 'हाँ']
  const noTerms = ['no', 'nope', 'nahi', 'नहीं']

  if (yesTerms.includes(clean)) return 'yes'
  if (noTerms.includes(clean)) return 'no'
  return null
}

export type ConfirmationChoice = 'confirm' | 'retry' | 'skip'

export function parseConfirmationCommand(transcript: string): ConfirmationChoice | null {
  const clean = transcript.trim().toLowerCase()
  if (!clean) return null

  const confirmTerms = ['confirm', 'yes', 'yeah', 'yep', 'correct']
  const retryTerms = ['retry', 'answer again', 'try again']
  const skipTerms = ['skip', 'bypass']

  if (confirmTerms.some(t => clean === t || clean.includes(t))) {
    return 'confirm'
  }
  if (retryTerms.some(t => clean === t || clean.includes(t))) {
    return 'retry'
  }
  if (skipTerms.some(t => clean === t || clean.includes(t))) {
    return 'skip'
  }
  return null
}

export function matchOption(
  transcript: string,
  options: { id: string; translations: Record<string, string> }[],
  lang: string
): string | null {
  const cleanInput = transcript.trim().toLowerCase().replace(/[.,?/#!$%^&*;:{}=\-_`~()]/g, "")
  if (!cleanInput) return null

  // 1. Try exact translation match for the current language
  for (const option of options) {
    const translation = option.translations[lang] || option.translations['en']
    if (!translation) continue
    const cleanTranslation = translation.trim().toLowerCase().replace(/[.,?/#!$%^&*;:{}=\-_`~()]/g, "")
    if (cleanInput === cleanTranslation) {
      return option.id
    }
  }

  // 2. Try partial/includes translation match
  for (const option of options) {
    const translation = option.translations[lang] || option.translations['en']
    if (!translation) continue
    const cleanTranslation = translation.trim().toLowerCase().replace(/[.,?/#!$%^&*;:{}=\-_`~()]/g, "")
    if (cleanInput.includes(cleanTranslation) || cleanTranslation.includes(cleanInput)) {
      return option.id
    }
  }

  // 3. Try matches for other languages (code-mixed support)
  for (const option of options) {
    for (const [, translation] of Object.entries(option.translations)) {
      const cleanTranslation = translation.trim().toLowerCase().replace(/[.,?/#!$%^&*;:{}=\-_`~()]/g, "")
      if (cleanInput === cleanTranslation || cleanInput.includes(cleanTranslation) || cleanTranslation.includes(cleanInput)) {
        return option.id
      }
    }
  }

  // 4. Custom rules for Yes / No
  if (options.length === 2 && options.some(o => o.id === 'yes') && options.some(o => o.id === 'no')) {
    const yesTerms = ['yes', 'yeah', 'yep', 'correct', 'haan', 'हाँ', 'होय', 'అవును', 'ஆம்', 'ಹೌದು']
    const noTerms = ['no', 'nope', 'wrong', 'nahi', 'नहीं', 'नाही', 'కాదు', 'இல்லை', 'ಇಲ್ಲ']
    
    if (yesTerms.some(t => cleanInput.includes(t))) {
      return 'yes'
    }
    if (noTerms.some(t => cleanInput.includes(t))) {
      return 'no'
    }
  }

  // 5. Fallback: match by option ID itself
  for (const option of options) {
    if (cleanInput === option.id.toLowerCase() || cleanInput.includes(option.id.toLowerCase())) {
      return option.id
    }
  }

  return null
}

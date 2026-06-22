import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { AccessibleCard } from '../components/AccessibleCard'
import { GlowingWave } from '../components/GlowingWave'
import { useLanguageStore, SUPPORTED_LANGUAGES } from '../store/languageStore'
import { useSurveyStore } from '../store/surveyStore'
import { clearProgress, getProgress } from '../db'
import { DEMO_SURVEY_ID } from '../db/seedData'
import { getSpeechProvider, getTTSProvider } from '../speech/factory'
import type { SpeechStatus, LanguageCode, SpeechProvider as ISpeechProvider, TTSProvider as ITTSProvider } from '../types'

export const LanguagePage: React.FC = () => {
  const navigate = useNavigate()
  const { setLanguage } = useLanguageStore()
  const { mode, loadProgress } = useSurveyStore()

  const [speechState, setSpeechState] = useState<SpeechStatus>('LISTENING')
  const [announcementText, setAnnouncementText] = useState('')
  const [hasResume, setHasResume] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const sttProvider = useRef<ISpeechProvider | null>(null)
  const ttsProvider = useRef<ITTSProvider | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    sttProvider.current = getSpeechProvider()
    ttsProvider.current = getTTSProvider()

    const checkProgress = async () => {
      try {
        const progress = await getProgress(DEMO_SURVEY_ID)
        if (progress) setHasResume(true)
      } catch (err) {
        console.warn('Failed to check progress:', err)
      }
      setInitialized(true)
    }
    checkProgress()

    return () => {
      mountedRef.current = false
      ttsProvider.current?.cancel()
      sttProvider.current?.stopListening()
    }
  }, [])

  const startGreetingFlow = async () => {
    if (!mountedRef.current) return
    setSpeechState('SPEAKING')

    let welcomeMsg = 'Please choose your preferred language. You can say English or Hindi. You can also tap a card.'
    if (hasResume) {
      welcomeMsg = 'You have an incomplete survey. Say resume to continue, or choose a language to start fresh.'
    }
    setAnnouncementText(welcomeMsg)

    if (ttsProvider.current) {
      await ttsProvider.current.speak(welcomeMsg, {
        lang: 'en-IN',
        rate: 0.95,
        onStart: () => { if (mountedRef.current) setSpeechState('SPEAKING') },
        onEnd: () => { if (mountedRef.current) startSttListening() },
        onError: () => { if (mountedRef.current) startSttListening() }
      })
    } else {
      startSttListening()
    }
  }

  useEffect(() => {
    if (initialized) {
      startGreetingFlow().catch(() => setSpeechState('LISTENING'))
    }
  }, [initialized, hasResume])

  const startSttListening = () => {
    if (!sttProvider.current || !mountedRef.current) return
    setSpeechState('LISTENING')

    sttProvider.current.startListening({
      lang: 'en-IN',
      onResult: (transcript: string, isFinal: boolean) => {
        if (isFinal && mountedRef.current) {
          setSpeechState('PROCESSING')
          handleSpokenInput(transcript)
        }
      },
      onError: (err: string) => {
        console.warn('STT Error:', err)
        if (mountedRef.current) {
          setTimeout(() => startSttListening(), 300)
        }
      },
      onEnd: () => {
        // Auto re-listen - NEVER go idle
        if (mountedRef.current) {
          setTimeout(() => startSttListening(), 300)
        }
      }
    })
  }

  const handleSpokenInput = (text: string) => {
    const cleaned = text.toLowerCase().trim()
    if (!cleaned) {
      startSttListening()
      return
    }

    // Check resume commands first
    if (hasResume && (cleaned.includes('resume') || cleaned.includes('continue'))) {
      handleResume()
      return
    }

    let matchedCode: LanguageCode | null = null
    if (cleaned.includes('english')) matchedCode = 'en'
    else if (cleaned.includes('hindi') || cleaned.includes('हिंदी')) matchedCode = 'hi'

    if (matchedCode) {
      selectLanguage(matchedCode)
    } else {
      const retryMsg = "I couldn't identify the language. Please say: English or Hindi."
      setAnnouncementText(retryMsg)
      setSpeechState('SPEAKING')
      ttsProvider.current?.speak(retryMsg, {
        lang: 'en-IN',
        rate: 0.95,
        onStart: () => { if (mountedRef.current) setSpeechState('SPEAKING') },
        onEnd: () => { if (mountedRef.current) startSttListening() },
        onError: () => { if (mountedRef.current) startSttListening() }
      })
    }
  }

  const selectLanguage = async (code: LanguageCode) => {
    ttsProvider.current?.cancel()
    sttProvider.current?.stopListening()

    // Selecting a language starts a new survey. Remove saved progress first so
    // survey initialization cannot restore and overwrite the new language.
    await clearProgress(DEMO_SURVEY_ID)
    setLanguage(code)

    const currentMode = mode || useSurveyStore.getState().mode
    if (currentMode === 'assisted') {
      navigate('/survey/assisted')
    } else {
      navigate('/survey/self-guided')
    }
  }

  const handleResume = async () => {
    ttsProvider.current?.cancel()
    sttProvider.current?.stopListening()
    setSpeechState('PROCESSING')

    const success = await loadProgress(DEMO_SURVEY_ID)
    if (success) {
      const recoveredMode = localStorage.getItem('vsurvey_recovered_mode')
      if (recoveredMode === 'self-guided') navigate('/survey/self-guided')
      else if (recoveredMode === 'assisted') navigate('/survey/assisted')
      else navigate('/survey/self-guided')
    } else {
      setHasResume(false)
      startGreetingFlow()
    }
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '0' && hasResume) {
        handleResume()
      } else {
        const index = parseInt(e.key, 10) - 1
        if (index >= 0 && index < SUPPORTED_LANGUAGES.length) {
          selectLanguage(SUPPORTED_LANGUAGES[index].code)
        }
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [hasResume])

  return (
    <Layout title="SAATHI SURVEY" announcement={announcementText}>
      <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 h-full min-h-0">

        <GlowingWave status={speechState} />

        <div className="w-full text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-white">
            Choose Your Language
          </h2>
          <p className="text-slate-400 text-base sm:text-lg font-medium">
            {hasResume ? 'Say "resume" or select a language to start fresh.' : 'Speak your language or tap a card.'}
          </p>
        </div>

        {hasResume && (
          <div className="w-full max-w-md">
            <AccessibleCard
              title="🔄 Resume Incomplete Survey"
              subtitle="Continue where you left off."
              keyboardShortcut="0"
              active={true}
              onClick={handleResume}
              className="border-violet-500 hover:border-violet-400 bg-violet-950/20 shadow-violet-500/10"
            />
          </div>
        )}

        <div className="flex flex-wrap justify-center items-center gap-6 w-full max-w-2xl">
          {SUPPORTED_LANGUAGES.map((lang, index) => (
            <div key={lang.code} className="flex-1 min-w-[260px] max-w-[320px]">
              <AccessibleCard
                title={lang.label}
                subtitle={lang.nativeLabel}
                keyboardShortcut={String(index + 1)}
                onClick={() => { void selectLanguage(lang.code) }}
              />
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
export default LanguagePage

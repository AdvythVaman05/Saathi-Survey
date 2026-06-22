import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { AccessibleCard } from '../components/AccessibleCard'
import { GlowingWave } from '../components/GlowingWave'
import { useSurveyStore } from '../store/surveyStore'
import { getSpeechProvider, getTTSProvider } from '../speech/factory'
import type { SpeechStatus, SurveyMode, SpeechProvider as ISpeechProvider, TTSProvider as ITTSProvider } from '../types'

export const ModePage: React.FC = () => {
  const navigate = useNavigate()
  const { setMode } = useSurveyStore()

  const [speechState, setSpeechState] = useState<SpeechStatus>('LISTENING')
  const [announcementText, setAnnouncementText] = useState('')
  const [userInteracted, setUserInteracted] = useState(false)

  const sttProvider = useRef<ISpeechProvider | null>(null)
  const ttsProvider = useRef<ITTSProvider | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    sttProvider.current = getSpeechProvider()
    ttsProvider.current = getTTSProvider()

    return () => {
      mountedRef.current = false
      ttsProvider.current?.cancel()
      sttProvider.current?.stopListening()
    }
  }, [])

  const startGreetingFlow = async () => {
    setUserInteracted(true)
    setSpeechState('SPEAKING')

    const welcomeMsg = 'Welcome to Saathi Survey. Please choose how you would like to participate. Say Self Guided for a fully voice-driven experience. Or say Assisted for caregiver support. You can also tap a card.'
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
    startGreetingFlow().catch(() => {
      setUserInteracted(false)
      setSpeechState('LISTENING')
    })
  }, [])

  const startSttListening = () => {
    if (!sttProvider.current || !mountedRef.current) return
    setSpeechState('LISTENING')

    sttProvider.current.startListening({
      lang: 'en-IN',
      onResult: (transcript: string, isFinal: boolean) => {
        if (isFinal && mountedRef.current) {
          setSpeechState('PROCESSING')
          handleSpokenMode(transcript)
        }
      },
      onError: (err: string) => {
        console.warn('STT Error:', err)
        // On any error including no-speech, re-listen
        if (mountedRef.current) {
          setTimeout(() => startSttListening(), 300)
        }
      },
      onEnd: () => {
        // Auto re-listen on silence - NEVER go idle
        if (mountedRef.current) {
          setTimeout(() => {
            startSttListening()
          }, 300)
        }
      }
    })
  }

  const handleSpokenMode = (text: string) => {
    const cleaned = text.toLowerCase().trim()
    if (!cleaned) {
      startSttListening()
      return
    }

    const isSelfGuided =
      cleaned.includes('self') ||
      cleaned.includes('guided') ||
      cleaned.includes('one') ||
      cleaned.includes('1') ||
      cleaned.includes('first')

    const isAssisted =
      cleaned.includes('assist') ||
      cleaned.includes('caregiver') ||
      cleaned.includes('help') ||
      cleaned.includes('two') ||
      cleaned.includes('2') ||
      cleaned.includes('second')

    if (isSelfGuided) {
      selectMode('self-guided')
    } else if (isAssisted) {
      selectMode('assisted')
    } else {
      const retryPrompt = "I didn't catch that. Please say: Self Guided, or Assisted."
      setAnnouncementText(retryPrompt)
      setSpeechState('SPEAKING')
      ttsProvider.current?.speak(retryPrompt, {
        lang: 'en-IN',
        onStart: () => { if (mountedRef.current) setSpeechState('SPEAKING') },
        onEnd: () => { if (mountedRef.current) startSttListening() },
        onError: () => { if (mountedRef.current) startSttListening() }
      })
    }
  }

  const selectMode = (mode: SurveyMode) => {
    ttsProvider.current?.cancel()
    sttProvider.current?.stopListening()
    setMode(mode)
    navigate('/language')
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '1') selectMode('self-guided')
      else if (e.key === '2') selectMode('assisted')
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return (
    <Layout title="SAATHI SURVEY" announcement={announcementText}>
      <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 h-full min-h-0">

        <GlowingWave status={speechState} />

        {!userInteracted && (
          <button
            onClick={startGreetingFlow}
            className="w-full max-w-md py-6 px-8 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-extrabold text-2xl rounded-2xl border-4 border-sky-400 shadow-lg shadow-sky-500/20 transition-all duration-200 select-none animate-pulse focus:outline-none"
            aria-label="Tap to start survey and hear options."
          >
            👋 Tap to Start
          </button>
        )}

        <div className="w-full text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-white">
            How would you like to participate?
          </h2>
          <p className="text-slate-400 text-base sm:text-lg font-medium">
            Speak your choice or tap a card below.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-6 w-full max-w-2xl">
          <AccessibleCard
            title="🎙️ Self-Guided"
            subtitle="Voice-only conversation with an AI interviewer. Fully hands-free."
            keyboardShortcut="1"
            onClick={() => selectMode('self-guided')}
          />
          <AccessibleCard
            title="🤝 Assisted"
            subtitle="A caregiver helps record responses, with manual controls."
            keyboardShortcut="2"
            onClick={() => selectMode('assisted')}
          />
        </div>
      </div>
    </Layout>
  )
}
export default ModePage

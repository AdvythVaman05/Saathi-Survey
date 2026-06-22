import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { GlowingWave } from '../components/GlowingWave'
import { useLanguageStore } from '../store/languageStore'
import { useSurveyStore } from '../store/surveyStore'
import { getSpeechProvider, getTTSProvider } from '../speech/factory'
import { parseConfirmationCommand } from '../speech/commands'
import type { SpeechStatus, SpeechProvider, TTSProvider } from '../types'

export const IntroPage: React.FC = () => {
  const navigate = useNavigate()
  const { getTranslation, getVoiceLocale } = useLanguageStore()
  const { 
    isPractice,
    practiceAnswer,
    practiceConfirming,
    startPractice,
    setPracticeAnswer,
    confirmPracticeAnswer,
    completePractice
  } = useSurveyStore()

  const [speechState, setSpeechState] = useState<SpeechStatus>('LISTENING')
  const [announcementText, setAnnouncementText] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  
  const sttProvider = useRef<SpeechProvider | null>(null)
  const ttsProvider = useRef<TTSProvider | null>(null)

  useEffect(() => {
    sttProvider.current = getSpeechProvider()
    ttsProvider.current = getTTSProvider()
    
    // Start Practice flow on load
    const runIntro = async () => {
      startPractice()
      
      const introText = `${getTranslation('welcomeOnboarding')} ${getTranslation('commandsHelp')}`
      const practicePrompt = getTranslation('practiceIntro')
      
      setAnnouncementText(introText)
      setSpeechState('SPEAKING')
      
      // Speak intro rules
      if (ttsProvider.current) {
        await ttsProvider.current.speak(introText, { lang: getVoiceLocale() })
        
        // Speak practice question
        setAnnouncementText(practicePrompt)
        await ttsProvider.current.speak(practicePrompt, {
          lang: getVoiceLocale(),
          onStart: () => setSpeechState('SPEAKING'),
          onEnd: () => {
            setSpeechState('LISTENING')
            startPracticeListening()
          },
          onError: () => {
            setSpeechState('LISTENING')
            startPracticeListening()
          }
        })
      }
    }

    runIntro()

    return () => {
      ttsProvider.current?.cancel()
      sttProvider.current?.stopListening()
    }
  }, [getTranslation, getVoiceLocale])

  // Listen for the user's practice answer
  const startPracticeListening = () => {
    if (!sttProvider.current) return

    setSpeechState('LISTENING')
    setInterimTranscript('')

    console.log(`ANSWER MODE ACTIVE`)
    console.log(`ACTIVE STT LOCALE: ${getVoiceLocale()}`)

    sttProvider.current.startListening({
      lang: getVoiceLocale(),
      onResult: (transcript: string, isFinal: boolean) => {
        setInterimTranscript(transcript)
        if (isFinal) {
          setSpeechState('PROCESSING')
          askConfirmation(transcript)
        }
      },
      onError: (err: string) => {
        console.warn('Practice STT Error:', err)
        // Re-listen on any error including no-speech
        setTimeout(() => startPracticeListening(), 300)
      },
      onEnd: () => {
        // Auto re-listen - never go idle
        setTimeout(() => startPracticeListening(), 300)
      }
    })
  }

  // Ask if what we heard is correct
  const askConfirmation = async (answerText: string) => {
    setPracticeAnswer(answerText)
    
    // 3-option confirmation flow prompt
    const confPrompt = `${getTranslation('iHeard')} "${answerText}". ${getTranslation('confirmationOptions')}`
    setAnnouncementText(confPrompt)
    
    setSpeechState('SPEAKING')
    if (ttsProvider.current) {
      await ttsProvider.current.speak(confPrompt, {
        lang: getVoiceLocale(),
        onStart: () => setSpeechState('SPEAKING'),
        onEnd: () => {
          setSpeechState('LISTENING')
          startConfirmListening(answerText)
        }
      })
    }
  }

  // Listen for confirmation choice
  const startConfirmListening = (answerText: string) => {
    if (!sttProvider.current) return

    setSpeechState('LISTENING')
    setInterimTranscript('')

    console.log(`COMMAND MODE ACTIVE`)
    console.log(`ACTIVE STT LOCALE: en-US`)

    sttProvider.current.startListening({
      lang: 'en-US',
      onResult: (transcript: string, isFinal: boolean) => {
        setInterimTranscript(transcript)
        if (isFinal) {
          setSpeechState('PROCESSING')
          handleConfirmResponse(transcript, answerText)
        }
      },
      onError: (err: string) => {
        console.warn('Confirm STT Error:', err)
        // Re-listen on any error
        setTimeout(() => startConfirmListening(answerText), 300)
      },
      onEnd: () => {
        // Auto re-listen - never go idle
        setTimeout(() => startConfirmListening(answerText), 300)
      }
    })
  }

  const handleConfirmResponse = async (voiceInput: string, answerText: string) => {
    const choice = parseConfirmationCommand(voiceInput)
    console.log('Confirmation choice parsed:', choice)

    if (choice === 'confirm') {
      confirmPracticeAnswer(true)
      
      const successText = getTranslation('practiceSuccess').replace('{answer}', answerText)
      setAnnouncementText(successText)
      
      setSpeechState('SPEAKING')
      if (ttsProvider.current) {
        await ttsProvider.current.speak(successText, {
          lang: getVoiceLocale(),
          onEnd: () => {
            setSpeechState('LISTENING')
            startCommandListening()
          }
        })
      }
    } else if (choice === 'retry') {
      confirmPracticeAnswer(false)
      
      const retryText = getTranslation('practiceError')
      setAnnouncementText(retryText)
      
      setSpeechState('SPEAKING')
      if (ttsProvider.current) {
        await ttsProvider.current.speak(retryText, {
          lang: getVoiceLocale(),
          onEnd: () => {
            setSpeechState('LISTENING')
            startPracticeListening()
          }
        })
      }
    } else if (choice === 'skip') {
      // User requested skip, proceed directly
      handleProceed()
    } else {
      // Repeat the 3-option prompt
      const retryPrompt = getTranslation('confirmPrompt')
      setAnnouncementText(retryPrompt)
      
      setSpeechState('SPEAKING')
      if (ttsProvider.current) {
        await ttsProvider.current.speak(retryPrompt, {
          lang: getVoiceLocale(),
          onEnd: () => {
            setSpeechState('LISTENING')
            startConfirmListening(answerText)
          }
        })
      }
    }
  }

  // Listen for commands (e.g. saying "next" to proceed)
  const startCommandListening = () => {
    if (!sttProvider.current) return

    setSpeechState('LISTENING')
    setInterimTranscript('')

    console.log(`COMMAND MODE ACTIVE`)
    console.log(`ACTIVE STT LOCALE: en-US`)

    sttProvider.current.startListening({
      lang: 'en-US',
      onResult: (transcript: string, isFinal: boolean) => {
        setInterimTranscript(transcript)
        if (isFinal) {
          const lower = transcript.toLowerCase().trim()
          if (lower.includes('next') || lower.includes('continue') || lower.includes('begin') || lower.includes('start')) {
            handleProceed()
          } else {
            // Re-listen
            startCommandListening()
          }
        }
      },
      onEnd: () => {
        // Auto re-listen - never go idle
        setTimeout(() => startCommandListening(), 300)
      },
      onError: () => {
        setTimeout(() => startCommandListening(), 300)
      }
    })
  }

  const handleProceed = () => {
    ttsProvider.current?.cancel()
    sttProvider.current?.stopListening()
    
    completePractice()
    navigate('/survey/self-guided')
  }

  return (
    <Layout title="SAATHI SURVEY" announcement={announcementText}>
      <div className="flex flex-col items-center gap-6 py-4">
        
        {/* Wave visualizer */}
        <GlowingWave status={speechState} />

        <div className="w-full text-center space-y-4">
          <h2 className="text-3xl font-extrabold tracking-wide text-white">
            Practice Walkthrough
          </h2>
          <p className="text-slate-400 text-lg font-medium">
            {isPractice && !practiceConfirming 
              ? 'Tell us your favorite food.' 
              : practiceConfirming
              ? 'Confirm if we heard correctly.'
              : 'Onboarding completed.'}
          </p>
        </div>

        {/* Dynamic Card Display */}
        <div className="w-full max-w-xl bg-slate-900 border-4 border-slate-800 rounded-3xl p-8 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold tracking-widest text-sky-400 uppercase">
              Auditory Practice
            </span>
            <h3 className="text-2xl font-extrabold text-white">
              "What is your favorite food?"
            </h3>
          </div>

          {/* Transcript feedback box */}
          {(interimTranscript || practiceAnswer) && (
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl">
              <span className="text-xs font-bold tracking-widest text-slate-500 uppercase block mb-1">
                Transcript Preview
              </span>
              <p className="text-lg font-medium text-slate-200">
                {interimTranscript || practiceAnswer}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleProceed}
          className="w-full max-w-xs py-5 bg-gradient-to-r from-sky-500 to-violet-600 text-white font-extrabold text-xl rounded-2xl shadow-lg border-b-4 border-violet-800 hover:brightness-110 active:brightness-95 transition-all select-none focus:outline-none"
        >
          Begin Survey
        </button>
      </div>
    </Layout>
  )
}
export default IntroPage

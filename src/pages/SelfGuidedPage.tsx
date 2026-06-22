import React, { useEffect, useState, useRef } from 'react'
import { useSurveyStore } from '../store/surveyStore'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { GlowingWave } from '../components/GlowingWave'
import { useLanguageStore } from '../store/languageStore'
import { getSpeechProvider, getTTSProvider } from '../speech/factory'
import { parseVoiceCommand, parseConfirmationCommand, matchOption, matchYesNo } from '../speech/commands'
import { seedLocalData, DEMO_SURVEY_ID } from '../db/seedData'
import { getSurveyWithQuestions } from '../db'
import { useToastStore } from '../store/toastStore'
import type { SpeechStatus, Question, SpeechProvider as ISpeechProvider, TTSProvider as ITTSProvider } from '../types'

type ActivePhase = 'prompting' | 'capturing_answer' | 'confirming_paragraph'

export const SelfGuidedPage: React.FC = () => {
  const navigate = useNavigate()

  const { getTranslation, getVoiceLocale, language } = useLanguageStore()
  const {
    questions,
    currentIndex,
    pendingAnswerText,
    setSurvey,
    loadProgress,
    nextQuestion,
    prevQuestion,
    startConfirmation,
    confirmAnswer,
    submitSurvey,
    setAnswerText,
    setOptionSelection,
    setAnswerAudio
  } = useSurveyStore()

  const { addToast } = useToastStore()

  const [speechState, setSpeechState] = useState<SpeechStatus>('LISTENING')
  const [announcementText, setAnnouncementText] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isPaused, setIsPaused] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [phase, setPhase] = useState<ActivePhase>('prompting')

  const sttProvider = useRef<ISpeechProvider | null>(null)
  const ttsProvider = useRef<ITTSProvider | null>(null)
  const isPlayingRef = useRef<boolean>(false)
  const mountedRef = useRef(true)
  const pausedRef = useRef(false)
  const processingRef = useRef(false)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    console.log(`STATE: ${speechState}`)
  }, [speechState])

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
  }

  const handleSilenceTimeout = () => {
    if (pausedRef.current || isPlayingRef.current) return
    ttsProvider.current?.cancel()
    sttProvider.current?.stopListening()
    const promptText = getTranslation('silenceTimeoutPrompt') || 'Would you like me to repeat the question or skip it?'
    setAnnouncementText(promptText)
    setSpeechState('SPEAKING')
    
    if (ttsProvider.current) {
      ttsProvider.current.speak(promptText, {
        lang: getVoiceLocale(),
        onStart: () => { if (mountedRef.current) setSpeechState('SPEAKING') },
        onEnd: () => {
          if (mountedRef.current && !pausedRef.current) {
             startSilenceCommandListening()
          }
        },
        onError: () => {
          if (mountedRef.current && !pausedRef.current) {
             startSilenceCommandListening()
          }
        }
      })
    }
  }

  const startSilenceCommandListening = () => {
    if (!sttProvider.current || pausedRef.current || !mountedRef.current) return
    processingRef.current = false
    setSpeechState('LISTENING')
    setInterimTranscript('')
    startSilenceTimer()

    console.log(`COMMAND MODE ACTIVE`)
    console.log(`ACTIVE STT LOCALE: en-US`)

    sttProvider.current.startListening({
      lang: 'en-US',
      onResult: (transcript: string, isFinal: boolean) => {
        if (!mountedRef.current) return
        setInterimTranscript(transcript)
        if (transcript.trim()) startSilenceTimer()
        if (isFinal) {
          clearSilenceTimer()
          console.log(`RAW TRANSCRIPT: ${transcript}`)
          processingRef.current = true
          setSpeechState('PROCESSING')
          
          const command = parseVoiceCommand(transcript)
          if (command) {
            executeVoiceCommand(command)
          } else {
            // Unrecognized command, go back to answering flow
            startAnsweringFlow()
          }
        }
      },
      onError: () => {
        if (mountedRef.current && !pausedRef.current) {
          restartTimerRef.current = setTimeout(() => startSilenceCommandListening(), 300)
        }
      },
      onEnd: () => {
        if (mountedRef.current && !pausedRef.current && !processingRef.current) {
          restartTimerRef.current = setTimeout(() => startSilenceCommandListening(), 300)
        }
      }
    })
  }

  const startSilenceTimer = () => {
    clearSilenceTimer()
    silenceTimerRef.current = setTimeout(handleSilenceTimeout, 30000)
  }

  useEffect(() => {
    let cancelled = false
    mountedRef.current = true
    sttProvider.current = getSpeechProvider()
    ttsProvider.current = getTTSProvider()

    const initSurvey = async () => {
      await seedLocalData()
      if (cancelled) return
      const data = await getSurveyWithQuestions(DEMO_SURVEY_ID)
      if (cancelled) return
      if (data) {
        setSurvey(data.survey, data.questions)
        await loadProgress(DEMO_SURVEY_ID)
      }
      if (!cancelled) setIsInitialized(true)
    }
    initSurvey()

    return () => {
      cancelled = true
      mountedRef.current = false
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
      clearSilenceTimer()
      ttsProvider.current?.cancel()
      sttProvider.current?.stopListening()
    }
  }, [])

  useEffect(() => {
    if (!isInitialized || pausedRef.current) return
    ttsProvider.current?.cancel()
    sttProvider.current?.stopListening()

    const currentQuestion = questions[currentIndex]
    if (currentQuestion) speakQuestion(currentQuestion)
  }, [currentIndex, isInitialized, isPaused])

  const speakQuestion = async (q: Question) => {
    if (!mountedRef.current) return
    isPlayingRef.current = true
    setPhase('prompting')
    setInterimTranscript('')
    const total = questions.length
    const currentLang = language || 'en'

    const qTranslation = q.translations[currentLang] || q.translations['en']
    const text = qTranslation.text

    const prefix = `${getTranslation('questionPrefix') || 'Question'} ${q.order} ${getTranslation('of') || 'of'} ${total}. `
    let optionsText = ''
    const choiceOptions = qTranslation.options || q.translations.en?.options
    if (q.type === 'single_choice' && choiceOptions) {
      optionsText = `. ${choiceOptions.map((opt, i) => `${i + 1}: ${opt.translations[currentLang] || opt.translations['en']}`).join('. ')}`
    } else if (q.type === 'yes_no') {
      optionsText = `. ${getTranslation('yes')} ${getTranslation('or') || 'or'} ${getTranslation('no')}.`
    }

    const speechText = `${prefix}${text}${optionsText}`
    setAnnouncementText(speechText)
    setSpeechState('SPEAKING')

    if (ttsProvider.current) {
      await ttsProvider.current.speak(speechText, {
        lang: getVoiceLocale(),
        onStart: () => { if (mountedRef.current) setSpeechState('SPEAKING') },
        onEnd: () => {
          isPlayingRef.current = false
          if (mountedRef.current && !pausedRef.current) startAnsweringFlow()
        },
        onError: (err: string) => {
          console.warn('TTS error:', err)
          isPlayingRef.current = false
          if (mountedRef.current && !pausedRef.current) startAnsweringFlow()
        }
      })
    }
  }

  const startAnsweringFlow = () => {
    if (!sttProvider.current || pausedRef.current || !mountedRef.current) return
    processingRef.current = false
    setPhase('capturing_answer')
    setSpeechState('LISTENING')
    setInterimTranscript('')
    startSilenceTimer()

    const locale = getVoiceLocale()
    console.log(`ANSWER MODE ACTIVE`)
    console.log(`ACTIVE STT LOCALE: ${locale}`)

    sttProvider.current.startListening({
      lang: locale,
      onResult: (transcript: string, isFinal: boolean) => {
        if (!mountedRef.current) return
        setInterimTranscript(transcript)
        if (transcript.trim()) startSilenceTimer()
        if (isFinal) {
          clearSilenceTimer()
          console.log(`RAW TRANSCRIPT: ${transcript}`)
          processingRef.current = true
          setSpeechState('PROCESSING')
          handleAnswerSpeechResult(transcript)
        }
      },
      onError: (err: string) => {
        console.warn('STT flow error:', err)
        // On ANY error including no-speech, re-listen
        if (mountedRef.current && !pausedRef.current) {
          restartTimerRef.current = setTimeout(() => startAnsweringFlow(), 300)
        }
      },
      onEnd: () => {
        // Auto re-listen on silence - NEVER go idle
        if (mountedRef.current && !pausedRef.current && !processingRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (!isPlayingRef.current && !processingRef.current) startAnsweringFlow()
          }, 300)
        }
      }
    })
  }

  const handleAnswerSpeechResult = async (transcript: string) => {
    const cleanText = transcript.trim()
    if (!cleanText) {
      startAnsweringFlow()
      return
    }

    // Check global voice commands first
    const command = parseVoiceCommand(cleanText)
    if (command) {
      executeVoiceCommand(command)
      return
    }

    const currentQuestion = questions[currentIndex]
    if (!currentQuestion) return

    const currentLang = language || 'en'
    const qTranslation = currentQuestion.translations[currentLang] || currentQuestion.translations['en']

    // YES/NO & SINGLE CHOICE: instant progression, NO confirmation
    if (currentQuestion.type === 'yes_no' || currentQuestion.type === 'single_choice') {
      const options = qTranslation.options || currentQuestion.translations.en?.options || [
        { id: 'yes', translations: { en: 'Yes', hi: 'हाँ', hinglish: 'Haan', mr: 'होय', te: 'అవును', ta: 'ஆம்', kn: 'ಹೌದು' } },
        { id: 'no', translations: { en: 'No', hi: 'नहीं', hinglish: 'Nahi', mr: 'नाही', te: 'కాదు', ta: 'இல்லை', kn: 'ಇಲ್ಲ' } }
      ]

      const matchedOptionId = currentQuestion.type === 'yes_no'
        ? matchYesNo(cleanText)
        : matchOption(cleanText, options, currentLang)

      if (matchedOptionId) {
        setOptionSelection(currentQuestion.id, matchedOptionId)
        const resolvedOpt = options.find(o => o.id === matchedOptionId)
        const originalLabel = resolvedOpt?.translations[currentLang] || cleanText
        setAnswerText(currentQuestion.id, originalLabel)

        let audioBlob: Blob | null = null
        if (sttProvider.current && 'getLastAudioBlob' in sttProvider.current) {
          audioBlob = (sttProvider.current as any).getLastAudioBlob()
        }
        if (audioBlob) {
          await setAnswerAudio(currentQuestion.id, audioBlob)
        } else {
          const { survey, mode } = useSurveyStore.getState()
          if (survey && mode) {
            startConfirmation(originalLabel, null)
            await confirmAnswer(true)
          }
        }

        addToast(getTranslation('saved'), 'success')
        nextQuestion()
      } else {
        // Did not match options - re-prompt
        const optionLabels = options.map(o => o.translations[currentLang] || o.translations['en']).join(', ')
        const retryPrompt = `${getTranslation('didNotMatch') || 'That does not match the options'}. ${optionLabels}.`
        setAnnouncementText(retryPrompt)
        setSpeechState('SPEAKING')
        if (ttsProvider.current) {
          await ttsProvider.current.speak(retryPrompt, {
            lang: getVoiceLocale(),
            onEnd: () => { if (mountedRef.current && !pausedRef.current) startAnsweringFlow() },
            onError: () => { if (mountedRef.current && !pausedRef.current) startAnsweringFlow() }
          })
        }
      }
    } else {
      // PARAGRAPH: enter 3-way confirmation (Confirm / Answer Again / Skip)
      let audioBlob: Blob | null = null
      if (sttProvider.current && 'getLastAudioBlob' in sttProvider.current) {
        audioBlob = (sttProvider.current as any).getLastAudioBlob()
      }
      startConfirmation(cleanText, audioBlob)
      askConfirmation(cleanText)
    }
  }

  const askConfirmation = async (text: string) => {
    if (!mountedRef.current) return
    setPhase('confirming_paragraph')
    const prompt = `${getTranslation('iHeard')} "${text}". ${getTranslation('confirmationOptions')}`
    setAnnouncementText(prompt)
    setSpeechState('SPEAKING')

    if (ttsProvider.current) {
      await ttsProvider.current.speak(prompt, {
        lang: getVoiceLocale(),
        onStart: () => { if (mountedRef.current) setSpeechState('SPEAKING') },
        onEnd: () => { if (mountedRef.current && !pausedRef.current) startConfirmListening() },
        onError: () => { if (mountedRef.current && !pausedRef.current) startConfirmListening() }
      })
    }
  }

  const startConfirmListening = () => {
    if (!sttProvider.current || pausedRef.current || !mountedRef.current) return
    processingRef.current = false
    setSpeechState('LISTENING')
    setInterimTranscript('')
    startSilenceTimer()

    console.log(`COMMAND MODE ACTIVE`)
    console.log(`ACTIVE STT LOCALE: en-US`)

    sttProvider.current.startListening({
      lang: 'en-US',
      onResult: (transcript: string, isFinal: boolean) => {
        if (!mountedRef.current) return
        setInterimTranscript(transcript)
        if (transcript.trim()) startSilenceTimer()
        if (isFinal) {
          clearSilenceTimer()
          console.log(`RAW TRANSCRIPT: ${transcript}`)
          processingRef.current = true
          setSpeechState('PROCESSING')
          handleConfirmResponse(transcript)
        }
      },
      onError: (err: string) => {
        console.warn('Confirm STT Error:', err)
        if (mountedRef.current && !pausedRef.current) {
          setTimeout(() => startConfirmListening(), 300)
        }
      },
      onEnd: () => {
        // Auto re-listen on silence
        if (mountedRef.current && !pausedRef.current && !processingRef.current) {
          setTimeout(() => startConfirmListening(), 300)
        }
      }
    })
  }

  const handleConfirmResponse = async (voiceInput: string) => {
    // Check for global commands first
    const command = parseVoiceCommand(voiceInput)
    if (command) {
      executeVoiceCommand(command)
      return
    }

    const choice = parseConfirmationCommand(voiceInput)

    if (choice === 'confirm') {
      await confirmAnswer(true)
      addToast(getTranslation('saved'), 'success')

      if (currentIndex >= questions.length - 1) {
        handleSubmit()
      } else {
        nextQuestion()
      }
    } else if (choice === 'retry') {
      await confirmAnswer(false)
      const q = questions[currentIndex]
      const retryText = `${getTranslation('tryAgain') || "Let's try again."}  ${q?.translations[language || 'en']?.text || ''}`
      setAnnouncementText(retryText)
      setSpeechState('SPEAKING')
      if (ttsProvider.current) {
        await ttsProvider.current.speak(retryText, {
          lang: getVoiceLocale(),
          onEnd: () => { if (mountedRef.current && !pausedRef.current) startAnsweringFlow() },
          onError: () => { if (mountedRef.current && !pausedRef.current) startAnsweringFlow() }
        })
      }
    } else if (choice === 'skip') {
      await confirmAnswer(false)
      const q = questions[currentIndex]
      if (q) {
        setAnswerText(q.id, 'Skipped')
        setOptionSelection(q.id, 'skipped')
      }
      if (currentIndex >= questions.length - 1) {
        handleSubmit()
      } else {
        nextQuestion()
      }
    } else {
      // Not matched - re-prompt confirmation
      const reprompt = getTranslation('confirmPrompt')
      setAnnouncementText(reprompt)
      setSpeechState('SPEAKING')
      if (ttsProvider.current) {
        await ttsProvider.current.speak(reprompt, {
          lang: getVoiceLocale(),
          onEnd: () => { if (mountedRef.current && !pausedRef.current) startConfirmListening() },
          onError: () => { if (mountedRef.current && !pausedRef.current) startConfirmListening() }
        })
      }
    }
  }

  const executeVoiceCommand = (command: string) => {
    console.log(`COMMAND DETECTED: ${command}`)
    switch (command) {
      case 'next':
        nextQuestion()
        break
      case 'back':
        prevQuestion()
        break
      case 'repeat': {
        const cq = questions[currentIndex]
        if (cq) speakQuestion(cq)
        break
      }
      case 'skip': {
        const q = questions[currentIndex]
        if (q) {
          setAnswerText(q.id, 'Skipped')
          setOptionSelection(q.id, 'skipped')
          if (currentIndex >= questions.length - 1) handleSubmit()
          else nextQuestion()
        }
        break
      }
      case 'pause':
        if (!pausedRef.current) pauseSurvey()
        break
      case 'resume':
        if (pausedRef.current) resumeSurvey()
        break
      case 'submit':
        handleSubmit()
        break
    }
  }

  const startPausedListening = () => {
    if (!sttProvider.current || !mountedRef.current || !pausedRef.current) return
    setSpeechState('PAUSED')

    console.log(`COMMAND MODE ACTIVE`)
    console.log(`ACTIVE STT LOCALE: en-US`)

    sttProvider.current.startListening({
      lang: 'en-US',
      onResult: (transcript, isFinal) => {
        if (isFinal && parseVoiceCommand(transcript) === 'resume') resumeSurvey()
      },
      onError: () => {
        if (mountedRef.current && pausedRef.current) {
          restartTimerRef.current = setTimeout(startPausedListening, 300)
        }
      },
      onEnd: () => {
        if (mountedRef.current && pausedRef.current) {
          restartTimerRef.current = setTimeout(startPausedListening, 300)
        }
      }
    })
  }

  const pauseSurvey = () => {
    clearSilenceTimer()
    ttsProvider.current?.cancel()
    sttProvider.current?.stopListening()
    processingRef.current = false
    pausedRef.current = true
    setIsPaused(true)
    setSpeechState('PAUSED')
    setAnnouncementText(getTranslation('paused') || 'Paused. Say Resume or tap Resume to continue.')
    restartTimerRef.current = setTimeout(startPausedListening, 300)
  }

  const resumeSurvey = () => {
    sttProvider.current?.stopListening()
    pausedRef.current = false
    setIsPaused(false)
    restartTimerRef.current = setTimeout(() => {
      const cq = questions[currentIndex]
      if (cq) speakQuestion(cq)
    }, 300)
  }

  const handlePauseToggle = () => pausedRef.current ? resumeSurvey() : pauseSurvey()

  const handleSubmit = async () => {
    ttsProvider.current?.cancel()
    sttProvider.current?.stopListening()
    await submitSurvey()
    navigate('/complete')
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextQuestion()
      else if (e.key === 'ArrowLeft') prevQuestion()
      else if (e.key === 'r' || e.key === 'R') {
        const cq = questions[currentIndex]
        if (cq) speakQuestion(cq)
      }
      else if (e.key === ' ') {
        e.preventDefault()
        handlePauseToggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, questions, isPaused])

  const activeQuestion = questions[currentIndex]
  const currentLang = language || 'en'
  const activeTranslation = activeQuestion?.translations[currentLang] || activeQuestion?.translations['en']

  if (!isInitialized || !activeQuestion || !activeTranslation) {
    return (
      <Layout title="SAATHI SURVEY">
        <div className="flex items-center justify-center h-full" role="status">
          <p className="text-xl text-slate-400">Loading interview...</p>
        </div>
      </Layout>
    )
  }

  // Compute the user-facing status label from the active speech state.
  const getStatusLabel = (): string => {
    if (isPaused) return getTranslation('paused') || 'Paused. Say Resume to continue.'
    if (speechState === 'LISTENING') return getTranslation('speakNow') || 'Listening... Speak your answer.'
    if (speechState === 'SPEAKING') return getTranslation('listenNow') || 'Listen to the question...'
    if (speechState === 'PROCESSING') return getTranslation('processing') || 'Processing...'
    return getTranslation('speakNow') || 'Ready. Speak your answer...'
  }

  return (
    <Layout title="SAATHI SURVEY" announcement={announcementText}>
      <div className="flex flex-col items-center justify-between gap-3 h-full select-none">

        {/* Top: Wave + Question */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <GlowingWave status={speechState} />
          <span className="text-sky-400 font-extrabold text-sm tracking-widest uppercase">
            {getTranslation('questionPrefix') || 'Question'} {currentIndex + 1} / {questions.length}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-white max-w-2xl mx-auto text-center leading-tight">
            {activeTranslation.text}
          </h2>
        </div>

        {/* Middle: Transcript Area */}
        <div className="w-full max-w-2xl bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 sm:p-6 flex-shrink-0">
          <span className="text-xs font-bold tracking-widest text-slate-500 uppercase block mb-2">
            {phase === 'confirming_paragraph' ? getTranslation('confirmChoice') || 'Confirmation' : getTranslation('yourResponse') || 'Your Response'}
          </span>
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl min-h-[60px] flex items-center justify-center">
            {interimTranscript || pendingAnswerText ? (
              <p className="text-lg font-bold text-slate-200 text-center leading-relaxed">
                "{interimTranscript || pendingAnswerText}"
              </p>
            ) : (
              <p className="text-base text-slate-500 italic">
                {getStatusLabel()}
              </p>
            )}
          </div>
        </div>

        {/* Bottom: Action Buttons */}
        <div className="flex flex-wrap justify-center gap-2 w-full max-w-2xl flex-shrink-0 pb-2">
          <button
            onClick={() => prevQuestion()}
            disabled={currentIndex === 0}
            className="px-4 py-3 bg-slate-900 border border-slate-800 text-slate-300 font-bold rounded-xl hover:border-slate-700 disabled:opacity-40 focus:outline-none text-sm"
            aria-label="Previous question"
          >
            ⬅️ Back
          </button>

          <button
            onClick={handlePauseToggle}
            className={`px-4 py-3 font-bold rounded-xl border focus:outline-none text-sm ${
              isPaused
                ? 'bg-emerald-950 border-emerald-800 text-emerald-400 hover:bg-emerald-900'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
            aria-label={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>

          <button
            onClick={() => executeVoiceCommand('repeat')}
            className="px-4 py-3 bg-slate-900 border border-slate-800 text-slate-300 font-bold rounded-xl hover:border-slate-700 focus:outline-none text-sm"
            aria-label="Repeat question"
          >
            🔄 Repeat
          </button>

          <button
            onClick={() => executeVoiceCommand('skip')}
            className="px-4 py-3 bg-slate-900 border border-slate-800 text-slate-300 font-bold rounded-xl hover:border-slate-700 focus:outline-none text-sm"
            aria-label="Skip question"
          >
            ⏭️ Skip
          </button>

          {currentIndex >= questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-gradient-to-r from-sky-500 to-violet-600 text-white font-extrabold rounded-xl border-b-4 border-violet-800 hover:brightness-110 focus:outline-none text-sm"
              aria-label="Submit survey"
            >
              📥 Submit
            </button>
          ) : (
            <button
              onClick={() => nextQuestion()}
              className="px-4 py-3 bg-slate-900 border border-slate-800 text-slate-300 font-bold rounded-xl hover:border-slate-700 focus:outline-none text-sm"
              aria-label="Next question"
            >
              Next ➡️
            </button>
          )}
        </div>
      </div>
    </Layout>
  )
}
export default SelfGuidedPage


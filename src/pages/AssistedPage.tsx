import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useLanguageStore } from '../store/languageStore'
import { getSpeechProvider, getTTSProvider } from '../speech/factory'
import { audioRecorder } from '../audio/recorder'
import { seedLocalData, DEMO_SURVEY_ID } from '../db/seedData'
import { getSurveyWithQuestions, db } from '../db'
import { useToastStore } from '../store/toastStore'
import { useSurveyStore } from '../store/surveyStore'
import type { Response, SpeechProvider, TTSProvider } from '../types'

export const AssistedPage: React.FC = () => {
  const navigate = useNavigate()
  
  const { getVoiceLocale, language } = useLanguageStore()
  const {
    survey,
    questions,
    currentIndex,
    answers,
    setSurvey,
    loadProgress,
    saveProgress,
    nextQuestion,
    prevQuestion,
    setAnswerText,
    setAnswerAudio,
    submitSurvey
  } = useSurveyStore()

  const { addToast } = useToastStore()

  const [isRecording, setIsRecording] = useState(false)
  const [transcriptText, setTranscriptText] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  
  // Track captured audio blob to save
  const capturedBlobRef = useRef<Blob | null>(null)

  const sttProvider = useRef<SpeechProvider | null>(null)
  const ttsProvider = useRef<TTSProvider | null>(null)

  useEffect(() => {
    let cancelled = false
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
      ttsProvider.current?.cancel()
      sttProvider.current?.stopListening()
      if (audioRecorder.isRecording()) {
        audioRecorder.stop().catch(() => {})
      }
    }
  }, [])

  // Sync state edit boxes when question changes
  useEffect(() => {
    if (!isInitialized) return
    const activeQuestion = questions[currentIndex]
    if (activeQuestion) {
      setTranscriptText(answers[activeQuestion.id] || '')
      setAudioUrl(null)
      capturedBlobRef.current = null
    }
  }, [currentIndex, isInitialized, answers, questions])

  const handleSpeakQuestion = () => {
    const activeQuestion = questions[currentIndex]
    const currentLang = language || 'en'
    const translation = activeQuestion?.translations[currentLang] || activeQuestion?.translations['en']
    if (translation && ttsProvider.current) {
      ttsProvider.current.speak(translation.text, {
        lang: getVoiceLocale(),
        onStart: () => {},
        onEnd: () => {},
        onError: () => {}
      })
    }
  }

  const handleStartRecording = async () => {
    if (!sttProvider.current) return
    
    ttsProvider.current?.cancel()
    setTranscriptText('')
    capturedBlobRef.current = null
    setAudioUrl(null)

    try {
      await audioRecorder.start()
      setIsRecording(true)

      sttProvider.current.startListening({
        lang: getVoiceLocale(),
        onResult: (transcript: string, isFinal: boolean) => {
          setTranscriptText(transcript)
          if (isFinal) {
            handleStopRecording()
          }
        },
        onError: (err: string) => {
          console.warn(err)
          setIsRecording(false)
          addToast(`Error: ${err}`, 'error')
        },
        onEnd: () => {
          setIsRecording(false)
        }
      })
    } catch (err) {
      addToast('Could not start recording. Please check microphone permissions.', 'error')
    }
  }

  const handleStopRecording = async () => {
    sttProvider.current?.stopListening()
    setIsRecording(false)

    if (audioRecorder.isRecording()) {
      try {
        const audio = await audioRecorder.stop()
        capturedBlobRef.current = audio.blob
        
        // Generate temporary URL to let the caregiver preview the audio
        const url = URL.createObjectURL(audio.blob)
        setAudioUrl(url)
      } catch (err) {
        console.warn('Audio capture failed', err)
      }
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setTranscriptText(text)
    
    const activeQuestion = questions[currentIndex]
    if (activeQuestion) {
      setAnswerText(activeQuestion.id, text)
    }
  }

  const handleSaveResponse = async () => {
    const activeQuestion = questions[currentIndex]
    if (!activeQuestion) return

    // Save final text in local store
    setAnswerText(activeQuestion.id, transcriptText)

    // Save audio blob if captured
    if (capturedBlobRef.current) {
      await setAnswerAudio(activeQuestion.id, capturedBlobRef.current)
    } else {
      // Just save text in DB
      const currentLang = language || 'en'
      const { sessionId, startedAt } = useSurveyStore.getState()
      
      const response: Response = {
        id: `${survey?.id}-${activeQuestion.id}-${Date.now()}`,
        survey_id: survey?.id || '',
        question_id: activeQuestion.id,
        language: currentLang,
        mode: 'assisted' as const,
        question_text: activeQuestion.translations[currentLang]?.text || '',
        question_type: activeQuestion.type,
        response_text_original: transcriptText,
        response_text_english: '', // Populated asynchronously in background translation queue
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'pending' as const,
        retry_count: 0,
        next_retry_at: null,
        session_id: sessionId,
        started_at: startedAt,
        completed_at: null,
        duration_seconds: Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)
      }
      await db.responses.put(response)
    }

    addToast('Response saved successfully!', 'success')
    await saveProgress()
  }

  const handlePrev = async () => {
    await handleSaveResponse()
    prevQuestion()
  }

  const handleNext = async () => {
    await handleSaveResponse()
    nextQuestion()
  }

  const handleSubmit = async () => {
    await handleSaveResponse()
    await submitSurvey()
    navigate('/complete')
  }

  const activeQuestion = questions[currentIndex]
  const currentLang = language || 'en'
  const activeTranslation = activeQuestion?.translations[currentLang] || activeQuestion?.translations['en']

  if (!isInitialized || !activeQuestion || !activeTranslation) {
    return (
      <Layout title="SAATHI SURVEY">
        <div className="text-center py-10" role="status">
          <p className="text-xl text-slate-400">Loading interview details...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Caregiver Console">
      <div className="flex flex-col gap-2 sm:gap-3 w-full max-w-3xl mx-auto h-full min-h-0">
        
        {/* Header navigation bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 select-none flex-shrink-0">
          <div className="space-y-1">
            <span className="text-sm font-bold text-sky-400 tracking-wider uppercase block">
              Assisted Interview
            </span>
            <h2 className="text-2xl font-extrabold text-white">
              {survey?.title}
            </h2>
          </div>
          <span className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 font-extrabold text-sm rounded-xl">
            Q {currentIndex + 1} / {questions.length}
          </span>
        </div>

        {/* Question Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-2 flex-shrink-0">
          <span className="text-xs font-bold tracking-widest text-slate-500 uppercase block">
            Question Text
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-100 leading-relaxed">
            {activeTranslation.text}
          </h3>
          
          <button
            onClick={handleSpeakQuestion}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold hover:bg-slate-750 transition focus:outline-none"
            aria-label="Play question audio to participant"
          >
            🔊 Read Aloud
          </button>
        </div>

        {/* Audio Recording Section */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 flex-1 min-h-0">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col justify-center items-center gap-2 min-h-0">
            <span className="text-xs font-bold tracking-widest text-slate-500 uppercase block w-full text-left">
              Microphone Capture
            </span>
            
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-4 shadow-lg transition-all focus:outline-none ${
                isRecording 
                  ? 'bg-rose-600 border-rose-450 hover:bg-rose-500 animate-pulse' 
                  : 'bg-sky-600 border-sky-400 hover:bg-sky-500'
              }`}
            >
              <span className="text-3xl">{isRecording ? '⏹️' : '🎙️'}</span>
            </button>

            <span className="text-sm font-bold text-slate-400 select-none">
              {isRecording ? 'Recording active...' : 'Press to capture speech'}
            </span>

            {/* Audio playback preview */}
            {audioUrl && (
              <audio 
                src={audioUrl} 
                controls 
                className="w-full mt-2 h-10 border border-slate-800 rounded-lg bg-slate-950" 
              />
            )}
          </div>

          {/* Transcript editing text box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col gap-2 min-h-0">
            <label 
              htmlFor="transcript"
              className="text-xs font-bold tracking-widest text-slate-500 uppercase block"
            >
              Response / Transcript
            </label>
            <textarea
              id="transcript"
              rows={3}
              value={transcriptText}
              onChange={handleTextChange}
              placeholder="Speech transcript will appear here automatically, or type the response manually..."
              className="w-full flex-1 min-h-0 p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 font-medium leading-relaxed resize-none"
            />
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-800 flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="px-5 py-3 bg-slate-900 border border-slate-800 text-slate-300 font-bold rounded-xl hover:border-slate-700 disabled:opacity-40 focus:outline-none"
            >
              ⬅️ Previous
            </button>
            <button
              onClick={handleSaveResponse}
              className="px-5 py-3 bg-slate-900 border border-slate-800 text-sky-400 font-bold rounded-xl hover:border-slate-700 focus:outline-none"
            >
              💾 Save
            </button>
          </div>

          {currentIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-gradient-to-r from-sky-500 to-violet-600 text-white font-extrabold rounded-xl border-b-4 border-violet-850 hover:brightness-110 focus:outline-none animate-pulse"
            >
              📥 Finish & Submit
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-slate-800 border border-slate-700 text-white font-bold rounded-xl hover:bg-slate-750 focus:outline-none"
            >
              Next Question ➡️
            </button>
          )}
        </div>
      </div>
    </Layout>
  )
}
export default AssistedPage

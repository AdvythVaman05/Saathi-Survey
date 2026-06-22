import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useLanguageStore } from '../store/languageStore'
import { useSurveyStore } from '../store/surveyStore'
import { getTTSProvider } from '../speech/factory'
import type { TTSProvider } from '../types'

export const CompletePage: React.FC = () => {
  const navigate = useNavigate()
  
  const { language, getTranslation, getVoiceLocale, resetLanguage } = useLanguageStore()
  const { reset: resetSurvey } = useSurveyStore()

  const [announcementText, setAnnouncementText] = useState('')
  const ttsProvider = useRef<TTSProvider | null>(null)

  useEffect(() => {
    ttsProvider.current = getTTSProvider()

    const speakCompletion = async () => {
      const completionMsg = getTranslation('completed')
      setAnnouncementText(completionMsg)
      
      if (ttsProvider.current) {
        await ttsProvider.current.speak(completionMsg, {
          lang: getVoiceLocale()
        })
      }
    }

    speakCompletion()

    return () => {
      ttsProvider.current?.cancel()
    }
  }, [getTranslation, getVoiceLocale])

  const handleReturnHome = () => {
    ttsProvider.current?.cancel()
    resetLanguage()
    resetSurvey()
    navigate('/')
  }

  const isHi = language === 'hi' || language === 'hinglish'
  const displayTitle = isHi ? '✓ सर्वे पूर्ण' : '✓ Survey Complete'
  const displayThanks = isHi ? 'धन्यवाद' : 'Thank You'
  const displayOptional = isHi ? 'आपकी प्रतिक्रियाएँ दर्ज कर ली गई हैं।' : 'Your responses have been recorded.'

  return (
    <Layout title={displayTitle} announcement={announcementText}>
      <div className="flex flex-col items-center gap-6 py-12 select-none max-w-md mx-auto">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-extrabold tracking-wide text-white">
            {displayThanks}
          </h2>
          <p className="text-slate-400 text-xl font-medium leading-relaxed">
            {displayOptional}
          </p>
        </div>

        <button
          onClick={handleReturnHome}
          className="mt-8 w-full py-5 bg-slate-900 hover:bg-slate-850 active:bg-slate-950 text-sky-400 border border-slate-800 font-extrabold text-lg rounded-2xl shadow-lg transition-all focus:outline-none"
        >
          Return to Home
        </button>
      </div>
    </Layout>
  )
}
export default CompletePage

import { create } from 'zustand'
import type { Survey, Question, SurveyMode, Response, SurveySession } from '../types'
import {
  saveProgress as dbSaveProgress,
  getProgress as dbGetProgress,
  clearProgress as dbClearProgress,
  saveResponse,
  saveSession,
} from '../db'
import { useLanguageStore } from './languageStore'

export function shouldSkipQuestion(question: Question, optionSelections: Record<string, string>): boolean {
  if (!question.skipCondition) return false

  switch (question.skipCondition) {
    case 'skip_if_not_custom_description':
      return optionSelections['naviksa-q4'] !== 'custom_description'
    case 'skip_if_q5_no':
      return optionSelections['naviksa-q5'] === 'no'
    case 'skip_if_not_q8_yes':
      return optionSelections['naviksa-q8'] !== 'yes'
    default:
      return false
  }
}

interface SurveyState {
  survey: Survey | null
  questions: Question[]
  currentIndex: number
  answers: Record<string, string>
  optionSelections: Record<string, string>
  mode: SurveyMode | null
  onboardingComplete: boolean
  surveyComplete: boolean
  isLoading: boolean
  error: string | null
  sessionId: string
  startedAt: string

  // Practice state
  isPractice: boolean
  practiceAnswer: string | null
  practiceConfirming: boolean

  // Voice confirmation flow states
  isConfirming: boolean
  pendingAnswerText: string | null
  pendingAudioBlob: Blob | null

  setSurvey: (survey: Survey, questions: Question[]) => void
  setMode: (mode: SurveyMode) => void
  nextQuestion: () => void
  prevQuestion: () => void
  goToQuestion: (index: number) => void
  getCurrentQuestion: () => Question | null
  setAnswerText: (qId: string, text: string) => void
  setOptionSelection: (qId: string, optionId: string) => void
  setAnswerAudio: (qId: string, blob: Blob) => Promise<void>
  
  // Confirmation actions
  startConfirmation: (text: string, blob: Blob | null) => void
  confirmAnswer: (isCorrect: boolean) => Promise<void>
  
  // Practice actions
  startPractice: () => void
  setPracticeAnswer: (text: string) => void
  confirmPracticeAnswer: (isCorrect: boolean) => void
  completePractice: () => void

  saveProgress: () => Promise<void>
  loadProgress: (surveyId: string) => Promise<boolean>
  submitSurvey: () => Promise<void>
  reset: () => void
}

export const useSurveyStore = create<SurveyState>((set, get) => ({
  survey: null,
  questions: [],
  currentIndex: 0,
  answers: {},
  optionSelections: {},
  mode: null,
  onboardingComplete: false,
  surveyComplete: false,
  isLoading: false,
  error: null,
  sessionId: '',
  startedAt: '',

  // Practice
  isPractice: false,
  practiceAnswer: null,
  practiceConfirming: false,

  // Confirmation state
  isConfirming: false,
  pendingAnswerText: null,
  pendingAudioBlob: null,

  setSurvey: (survey, questions) => {
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    const startedAt = new Date().toISOString()
    set({
      survey,
      questions,
      currentIndex: 0,
      answers: {},
      optionSelections: {},
      sessionId,
      startedAt,
      surveyComplete: false,
      onboardingComplete: false,
      isConfirming: false,
      pendingAnswerText: null,
      pendingAudioBlob: null
    })
  },

  setMode: (mode) => {
    set({ mode })
    localStorage.setItem('vsurvey_recovered_mode', mode)
    get().saveProgress()
  },

  nextQuestion: () => {
    const { currentIndex, questions, optionSelections } = get()
    let nextIndex = currentIndex + 1
    while (nextIndex < questions.length) {
      if (shouldSkipQuestion(questions[nextIndex], optionSelections)) {
        nextIndex++
      } else {
        break
      }
    }

    if (nextIndex < questions.length) {
      set({ 
        currentIndex: nextIndex,
        isConfirming: false,
        pendingAnswerText: null,
        pendingAudioBlob: null
      })
      get().saveProgress()
    } else {
      get().submitSurvey()
    }
  },

  prevQuestion: () => {
    const { currentIndex, questions, optionSelections } = get()
    let prevIndex = currentIndex - 1
    while (prevIndex >= 0) {
      if (shouldSkipQuestion(questions[prevIndex], optionSelections)) {
        prevIndex--
      } else {
        break
      }
    }

    if (prevIndex >= 0) {
      set({ 
        currentIndex: prevIndex,
        isConfirming: false,
        pendingAnswerText: null,
        pendingAudioBlob: null
      })
      get().saveProgress()
    }
  },

  goToQuestion: (index) => {
    const { questions } = get()
    if (index >= 0 && index < questions.length) {
      set({ 
        currentIndex: index,
        isConfirming: false,
        pendingAnswerText: null,
        pendingAudioBlob: null
      })
      get().saveProgress()
    }
  },

  getCurrentQuestion: () => {
    const { questions, currentIndex } = get()
    return questions[currentIndex] ?? null
  },

  setAnswerText: (qId, text) => {
    set((state) => ({
      answers: { ...state.answers, [qId]: text }
    }))
    get().saveProgress()
  },

  setOptionSelection: (qId, optionId) => {
    set((state) => ({
      optionSelections: { ...state.optionSelections, [qId]: optionId }
    }))
    get().saveProgress()
  },

  setAnswerAudio: async (qId, blob) => {
    const { survey, mode, sessionId, startedAt, questions } = get()
    if (!survey || !mode) return

    const language = useLanguageStore.getState().language || 'en'
    const question = questions.find(q => q.id === qId)
    
    const response: Response = {
      id: `${survey.id}-${qId}-${Date.now()}`,
      survey_id: survey.id,
      question_id: qId,
      language,
      mode,
      question_text: question?.translations[language]?.text || '',
      question_type: question?.type || 'unknown',
      response_text_original: get().answers[qId] || '',
      response_text_english: '', // Populated asynchronously in background translation
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending',
      retry_count: 0,
      next_retry_at: null,
      
      // Session Metrics
      session_id: sessionId,
      started_at: startedAt,
      completed_at: null,
      duration_seconds: Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)
    }

    await saveResponse(response, blob)
  },

  startConfirmation: (text, blob) => {
    set({
      isConfirming: true,
      pendingAnswerText: text,
      pendingAudioBlob: blob
    })
  },

  confirmAnswer: async (isCorrect) => {
    const { pendingAnswerText, pendingAudioBlob, getCurrentQuestion, sessionId, startedAt } = get()
    const question = getCurrentQuestion()
    
    if (!question) return

    if (isCorrect && pendingAnswerText) {
      set((state) => ({
        answers: { ...state.answers, [question.id]: pendingAnswerText },
        isConfirming: false,
        pendingAnswerText: null,
        pendingAudioBlob: null
      }))
      
      await get().saveProgress()
      
      if (pendingAudioBlob) {
        await get().setAnswerAudio(question.id, pendingAudioBlob)
      } else {
        const language = useLanguageStore.getState().language || 'en'
        const { survey, mode } = get()
        if (survey && mode) {
          const response: Response = {
            id: `${survey.id}-${question.id}-${Date.now()}`,
            survey_id: survey.id,
            question_id: question.id,
            language,
            mode,
            question_text: question.translations[language]?.text || '',
            question_type: question.type,
            response_text_original: pendingAnswerText,
            response_text_english: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sync_status: 'pending',
            retry_count: 0,
            next_retry_at: null,
            
            // Session Metrics
            session_id: sessionId,
            started_at: startedAt,
            completed_at: null,
            duration_seconds: Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)
          }
          await saveResponse(response)
        }
      }
    } else {
      set({
        isConfirming: false,
        pendingAnswerText: null,
        pendingAudioBlob: null
      })
    }
  },

  startPractice: () => {
    set({
      isPractice: true,
      practiceAnswer: null,
      practiceConfirming: false
    })
  },

  setPracticeAnswer: (text) => {
    set({
      practiceAnswer: text,
      practiceConfirming: true
    })
  },

  confirmPracticeAnswer: (isCorrect) => {
    if (isCorrect) {
      set({
        practiceConfirming: false
      })
    } else {
      set({
        practiceAnswer: null,
        practiceConfirming: false
      })
    }
  },

  completePractice: () => {
    set({
      isPractice: false,
      practiceAnswer: null,
      practiceConfirming: false,
      onboardingComplete: true
    })
    get().saveProgress()
  },

  saveProgress: async () => {
    const { survey, mode, currentIndex, answers, optionSelections, sessionId, startedAt, onboardingComplete } = get()
    if (!survey) return

    const language = useLanguageStore.getState().language || 'en'

    const progress = {
      survey_id: survey.id,
      session_id: sessionId || `sess-${Date.now()}`,
      language,
      mode: mode || 'self-guided',
      current_index: currentIndex,
      answers,
      option_selections: optionSelections,
      onboarding_complete: onboardingComplete,
      started_at: startedAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    await dbSaveProgress(progress)
  },

  loadProgress: async (surveyId) => {
    const progress = await dbGetProgress(surveyId)
    if (!progress) return false

    set({
      currentIndex: progress.current_index,
      answers: progress.answers || {},
      optionSelections: progress.option_selections || {},
      sessionId: progress.session_id || `sess-${Date.now()}`,
      startedAt: progress.started_at || new Date().toISOString(),
      mode: progress.mode,
      onboardingComplete: progress.onboarding_complete
    })
    
    if (progress.language) {
      useLanguageStore.getState().setLanguage(progress.language)
    }
    if (progress.mode) {
      localStorage.setItem('vsurvey_recovered_mode', progress.mode)
    }

    return true
  },

  submitSurvey: async () => {
    const { survey, mode, sessionId, startedAt, answers, optionSelections } = get()
    if (!survey || !mode) return

    const language = useLanguageStore.getState().language || 'en'
    
    // Extract demographics using stable IDs
    const participant_name = answers['naviksa-q1'] || null
    const age_group = optionSelections['naviksa-q2'] || null
    const location = answers['naviksa-q3'] || null
    const vision_type = optionSelections['naviksa-q4'] || null
    
    const now = new Date()
    const session: SurveySession = {
      id: sessionId,
      session_id: sessionId,
      survey_id: survey.id,
      participant_name,
      age_group,
      location,
      vision_type,
      language,
      mode,
      started_at: startedAt,
      completed_at: now.toISOString(),
      duration_seconds: Math.round((now.getTime() - new Date(startedAt).getTime()) / 1000),
      completion_percentage: 100,
      is_completed: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      sync_status: 'pending',
      retry_count: 0,
      next_retry_at: null
    }

    await saveSession(session)

    await dbClearProgress(survey.id)
    localStorage.removeItem('vsurvey_recovered_mode')
    
    set({
      surveyComplete: true,
      isConfirming: false,
      pendingAnswerText: null,
      pendingAudioBlob: null
    })
  },

  reset: () => {
    set({
      survey: null,
      questions: [],
      currentIndex: 0,
      answers: {},
      optionSelections: {},
      mode: null,
      onboardingComplete: false,
      surveyComplete: false,
      isPractice: false,
      practiceAnswer: null,
      practiceConfirming: false,
      isConfirming: false,
      pendingAnswerText: null,
      pendingAudioBlob: null,
      isLoading: false,
      error: null,
      sessionId: '',
      startedAt: ''
    })
  }
}))

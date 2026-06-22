export type SurveyMode = 'self-guided' | 'assisted'

export type QuestionType = 'yes_no' | 'single_choice' | 'paragraph_short' | 'paragraph'

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'

export type SpeechStatus = 'SPEAKING' | 'LISTENING' | 'PROCESSING' | 'PAUSED'

export type LanguageCode = 'en' | 'hi' | 'hinglish' | 'mr' | 'te' | 'ta' | 'kn'

export interface Survey {
  id: string
  title: string
  description: string
  created_at: string
}

export interface QuestionOption {
  id: string
  translations: Record<string, string> // e.g. { en: "Under 18", hi: "18 से कम", ... }
}

export interface Question {
  id: string
  survey_id: string
  order: number
  type: QuestionType
  required: boolean
  translations: Record<string, {
    text: string
    options?: QuestionOption[]
    examples?: string
  }>
  skipCondition?: string // Representation of skip logic rules, e.g. "skip_if_q5_no"
  followUpFor?: string  // Links follow-up to parent question id, e.g. "naviksa-q4"
}

export interface Response {
  id: string
  survey_id: string
  question_id: string
  language: LanguageCode
  mode: SurveyMode
  response_text_original: string
  response_text_english: string
  audio_url?: string
  category?: string
  pain_points?: string
  keywords?: string
  created_at: string
  updated_at: string
  sync_status: SyncStatus
  retry_count: number
  next_retry_at: string | null
  
  // Extra fields for database
  question_text: string
  question_type: string
  
  // Session Metrics
  session_id: string
  started_at: string
  completed_at: string | null
  duration_seconds: number
}

export interface SurveySession {
  id: string
  session_id: string
  survey_id: string
  participant_name: string | null
  age_group: string | null
  location: string | null
  vision_type: string | null
  language: LanguageCode
  mode: SurveyMode
  started_at: string
  completed_at: string | null
  duration_seconds: number
  completion_percentage: number
  is_completed: boolean
  created_at: string
  updated_at: string
  sync_status: SyncStatus
  retry_count: number
  next_retry_at: string | null
}

export interface AudioRecord {
  response_id: string
  audio_blob: Blob
  mime_type: string
  created_at: string
}

export interface SurveyProgress {
  survey_id: string
  session_id: string
  language: LanguageCode
  mode: SurveyMode
  current_index: number
  answers: Record<string, string> // maps questionId -> original text answer
  option_selections: Record<string, string> // maps questionId -> option ID selection
  onboarding_complete: boolean
  started_at: string
  updated_at: string
}

export interface SyncLog {
  id: string
  timestamp: string
  type: 'success' | 'failure'
  message: string
}

export type { SpeechProvider, TTSProvider, SpeakOptions } from '../speech/provider'

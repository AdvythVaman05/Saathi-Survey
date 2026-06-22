import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Response, SurveySession } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let supabase: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null
  if (supabaseUrl.includes('your-project') || supabaseAnonKey.includes('your-anon-key')) {
    return null
  }

  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabase
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null
}

/**
 * Uploads audio blob to Supabase Storage bucket 'survey-audios'
 * and returns the public download URL.
 */
export async function uploadAudioToSupabase(
  responseId: string, 
  surveyId: string, 
  questionId: string, 
  audioBlob: Blob,
  mimeType: string
): Promise<string | null> {
  const client = getSupabaseClient()
  if (!client) return null

  // Clean mime type to resolve file extensions
  let extension = 'webm'
  if (mimeType.includes('ogg')) extension = 'ogg'
  else if (mimeType.includes('mp4')) extension = 'mp4'
  else if (mimeType.includes('aac')) extension = 'aac'
  else if (mimeType.includes('wav')) extension = 'wav'

  const filePath = `${surveyId}/${questionId}/${responseId}.${extension}`

  const { error } = await client.storage
    .from('survey-audios')
    .upload(filePath, audioBlob, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: true
    })

  if (error) {
    console.error('Supabase Storage upload error:', error.message)
    throw error
  }

  // Get public download url
  const { data } = client.storage.from('survey-audios').getPublicUrl(filePath)
  return data.publicUrl
}

/**
 * Pushes a survey session to Supabase.
 */
export async function pushSessionToSupabase(session: SurveySession): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    const { error } = await client.from('survey_sessions').insert({
      session_id: session.session_id,
      survey_id: session.survey_id,
      participant_name: session.participant_name,
      age_group: session.age_group,
      location: session.location,
      vision_type: session.vision_type,
      language: session.language,
      mode: session.mode,
      started_at: session.started_at,
      completed_at: session.completed_at,
      duration_seconds: session.duration_seconds,
      completion_percentage: session.completion_percentage,
      is_completed: session.is_completed,
      created_at: session.created_at,
      updated_at: session.updated_at,
      sync_status: 'synced'
    })

    if (error) {
      if (error.code === '23505') {
        // 23505 is unique violation, which means it already exists. Treat as success.
        return true
      }
      console.error('Supabase session insert error:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('Remote sync push session crash:', err)
    return false
  }
}

/**
 * Pushes a text response metadata and (if present) its audio to Supabase.
 */
export async function pushResponseToSupabase(
  response: Response, 
  audioBlob?: Blob,
  mimeType?: string
): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    let audioUrl: string | null = null

    // Upload audio blob first if available
    if (audioBlob) {
      audioUrl = await uploadAudioToSupabase(
        response.id,
        response.survey_id,
        response.question_id,
        audioBlob,
        mimeType || audioBlob.type || 'audio/webm'
      )
    }

    // Insert response metadata table record
    const { error } = await client.from('survey_answers').insert({
      session_id: response.session_id,
      survey_id: response.survey_id,
      question_id: response.question_id,
      question_text: response.question_text,
      question_type: response.question_type,
      language: response.language,
      response_text_original: response.response_text_original,
      response_text_english: response.response_text_english,
      audio_url: audioUrl,
      created_at: response.created_at,
      updated_at: response.updated_at,
      sync_status: 'synced'
    })

    if (error) {
      if (error.code === '23505') {
        // 23505 is unique violation, which means it already exists. Treat as success.
        return true
      }
      console.error('Supabase insert error:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('Remote sync push crash:', err)
    return false
  }
}

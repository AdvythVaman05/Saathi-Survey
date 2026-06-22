import Dexie, { type Table } from 'dexie'
import type { Survey, Question, Response, AudioRecord, SurveyProgress, SurveySession } from '../types'

export class VoiceSurveyDB extends Dexie {
  surveys!: Table<Survey, string>
  questions!: Table<Question, string>
  responses!: Table<Response, string>
  audio_records!: Table<AudioRecord, string>
  progress!: Table<SurveyProgress, string>
  sessions!: Table<SurveySession, string>

  constructor() {
    super('VoiceSurveyDB')
    
    // Version definitions
    this.version(1).stores({
      surveys: 'id, title, created_at',
      questions: 'id, survey_id, order',
      responses: 'id, survey_id, question_id, sync_status, created_at, next_retry_at',
      audio_records: 'response_id, created_at',
      progress: 'survey_id, updated_at',
    })
    
    this.version(2).stores({
      sessions: 'id, session_id, sync_status, next_retry_at',
      responses: 'id, session_id, survey_id, question_id, sync_status, created_at, next_retry_at' // added session_id to index if needed
    })
  }
}

export const db = new VoiceSurveyDB()

// Database Helper Actions

export async function getSurveyWithQuestions(surveyId: string) {
  const survey = await db.surveys.get(surveyId)
  if (!survey) return null

  const questions = await db.questions
    .where('survey_id')
    .equals(surveyId)
    .sortBy('order')

  return { survey, questions }
}

export async function saveResponse(response: Response, audioBlob?: Blob, mimeType?: string): Promise<void> {
  // Save text response record
  await db.responses.put(response)
  
  // Save audio blob in separate audio_records table to preserve lookup speeds
  if (audioBlob) {
    await db.audio_records.put({
      response_id: response.id,
      audio_blob: audioBlob,
      mime_type: mimeType || audioBlob.type || 'audio/webm',
      created_at: new Date().toISOString()
    })
  }
}

export async function getAudioRecord(responseId: string): Promise<AudioRecord | undefined> {
  return db.audio_records.get(responseId)
}

export async function deleteResponse(id: string): Promise<void> {
  await db.responses.delete(id)
  await db.audio_records.delete(id)
}

export async function getPendingResponses(): Promise<Response[]> {
  return db.responses
    .where('sync_status')
    .anyOf('pending', 'failed')
    .toArray()
}

export async function markResponseSynced(id: string): Promise<void> {
  await db.responses.update(id, { 
    sync_status: 'synced',
    updated_at: new Date().toISOString() 
  })
}

export async function markResponseSyncing(id: string): Promise<void> {
  await db.responses.update(id, {
    sync_status: 'syncing',
    updated_at: new Date().toISOString()
  })
}

export async function markResponseFailed(
  id: string, 
  retryCount: number, 
  nextRetryAt: string | null
): Promise<void> {
  await db.responses.update(id, {
    sync_status: 'failed',
    retry_count: retryCount,
    next_retry_at: nextRetryAt,
    updated_at: new Date().toISOString()
  })
}

export async function saveProgress(progress: SurveyProgress): Promise<void> {
  await db.progress.put(progress)
}

export async function getProgress(surveyId: string): Promise<SurveyProgress | undefined> {
  return db.progress.get(surveyId)
}

export async function clearProgress(surveyId: string): Promise<void> {
  await db.progress.delete(surveyId)
}

export async function getResponsesForSurvey(surveyId: string): Promise<Response[]> {
  return db.responses.where('survey_id').equals(surveyId).toArray()
}

export async function saveSession(session: SurveySession): Promise<void> {
  await db.sessions.put(session)
}

export async function getPendingSessions(): Promise<SurveySession[]> {
  return db.sessions
    .where('sync_status')
    .anyOf('pending', 'failed')
    .toArray()
}

export async function markSessionSynced(id: string): Promise<void> {
  await db.sessions.update(id, {
    sync_status: 'synced',
    updated_at: new Date().toISOString()
  })
}

export async function markSessionSyncing(id: string): Promise<void> {
  await db.sessions.update(id, {
    sync_status: 'syncing',
    updated_at: new Date().toISOString()
  })
}

export async function markSessionFailed(
  id: string,
  retryCount: number,
  nextRetryAt: string | null
): Promise<void> {
  await db.sessions.update(id, {
    sync_status: 'failed',
    retry_count: retryCount,
    next_retry_at: nextRetryAt,
    updated_at: new Date().toISOString()
  })
}

export async function getResponsesForSession(sessionId: string): Promise<Response[]> {
  // We didn't index session_id directly in version 1, but we added it in version 2
  return db.responses.where('session_id').equals(sessionId).toArray()
}

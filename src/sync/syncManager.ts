import { 
  getAudioRecord, 
  markSessionSynced, 
  markSessionSyncing,
  markSessionFailed,
  getPendingSessions,
  getResponsesForSession,
  markResponseSynced,
  db
} from '../db'
import { pushResponseToSupabase, pushSessionToSupabase, isSupabaseConfigured } from '../services/supabase'
import { useSyncStore } from '../store/syncStore'
import type { SurveySession } from '../types'

let syncIntervalId: any = null
let translationIntervalId: any = null

const SYNC_INTERVAL_MS = 10000 // Check sync every 10 seconds
const TRANSLATION_INTERVAL_MS = 3000 // Check translations every 3 seconds

function mapLanguageCodeForTranslate(lang: string): string {
  const clean = lang.toLowerCase().split('-')[0]
  switch (clean) {
    case 'hi':
    case 'hinglish':
      return 'hi-IN'
    case 'mr':
      return 'mr-IN'
    case 'te':
      return 'te-IN'
    case 'ta':
      return 'ta-IN'
    case 'kn':
      return 'kn-IN'
    case 'en':
    default:
      return 'en-IN'
  }
}

/**
 * Background worker that translates non-English responses in the queue.
 */
export async function runTranslationQueue(): Promise<void> {
  try {
    // Find all responses that do not have response_text_english populated yet
    const pendingResponses = await db.responses.toArray()
    const untranslated = pendingResponses.filter(r => r.response_text_english === '')

    if (untranslated.length === 0) return

    const apiKey = import.meta.env.VITE_SARVAM_API_KEY as string | undefined

    for (const response of untranslated) {
      // 1. If language is English, copy original immediately
      if (response.language === 'en') {
        response.response_text_english = response.response_text_original
        response.updated_at = new Date().toISOString()
        await db.responses.put(response)
        continue
      }

      // 2. If it has no original text, skip or copy empty
      if (!response.response_text_original.trim()) {
        response.response_text_english = response.response_text_original
        response.updated_at = new Date().toISOString()
        await db.responses.put(response)
        continue
      }

      // 3. Translate using Sarvam AI
      if (apiKey && !apiKey.includes('your-') && apiKey.trim() !== '') {
        try {
          const sourceLang = mapLanguageCodeForTranslate(response.language)
          const res = await fetch('https://api.sarvam.ai/translate', {
            method: 'POST',
            headers: {
              'api-subscription-key': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              input: response.response_text_original,
              source_language_code: sourceLang,
              target_language_code: 'en-IN'
            })
          })

          if (res.ok) {
            const data = await res.json()
            if (data.translated_text) {
              response.response_text_english = data.translated_text
              response.updated_at = new Date().toISOString()
              await db.responses.put(response)
              console.log(`[Translation Queue] Translated Response ${response.id}: "${data.translated_text}"`)
            }
          } else {
            console.error(`[Translation Queue] Sarvam Translate API returned status ${res.status}: ${res.statusText}`)
          }
        } catch (err) {
          console.error(`[Translation Queue] Error calling Sarvam Translate for ${response.id}:`, err)
        }
      } else {
        // Fallback: Copy original directly
        response.response_text_english = response.response_text_original
        response.updated_at = new Date().toISOString()
        await db.responses.put(response)
      }
    }
  } catch (err) {
    console.error('[Translation Queue] Error in translation worker:', err)
  }
}

/**
 * Main worker loop that processes the local IndexedDB pending queue.
 */
export async function runSyncWorker(): Promise<void> {
  const syncStore = useSyncStore.getState()
  
  if (syncStore.isSyncing) {
    console.log('runSyncWorker: Already syncing')
    return
  }

  // Check online status first
  if (!syncStore.isOnline) {
    console.log('runSyncWorker: App is offline')
    return
  }

  // Only proceed if Supabase is actually configured
  if (!isSupabaseConfigured()) {
    console.log('runSyncWorker: Supabase not configured')
    return
  }

  syncStore.setSyncing(true)
  console.log('runSyncWorker: Starting sync logic...')
  
  const pendingSessions = await getPendingSessions()
  if (pendingSessions.length === 0) {
    console.log('runSyncWorker: No pending sessions')
    syncStore.setSyncing(false)
    return
  }

  syncStore.setLastError(null)

  const now = Date.now()

  for (const session of pendingSessions) {
    // Check if the item is in backoff delay
    if (session.next_retry_at && new Date(session.next_retry_at).getTime() > now) {
      continue
    }

    try {
      await markSessionSyncing(session.id)
      
      const sessionSuccess = await pushSessionToSupabase(session)
      
      if (sessionSuccess) {
        const responses = await getResponsesForSession(session.session_id)
        let allResponsesSynced = true
        
        for (const response of responses) {
          // If response isn't translated, wait
          if (response.response_text_english === '' && response.language !== 'en' && response.response_text_original !== '') {
            // Wait for translation worker
            allResponsesSynced = false
            continue
          }
          
          if (response.sync_status === 'synced') {
            continue
          }
          
          const audioRecord = await getAudioRecord(response.id)
          const responseSuccess = await pushResponseToSupabase(
            response, 
            audioRecord?.audio_blob, 
            audioRecord?.mime_type
          )

          if (responseSuccess) {
            await markResponseSynced(response.id)
            await db.audio_records.delete(response.id)
          } else {
            allResponsesSynced = false
          }
        }
        
        if (allResponsesSynced) {
          await markSessionSynced(session.id)
          syncStore.addSyncLog('success', `Session ${session.session_id} synced successfully.`)
        } else {
          await handleFailedSyncAttempt(session, 'Some responses failed to sync')
        }
      } else {
        await handleFailedSyncAttempt(session, 'Session metadata upload failed')
      }
    } catch (err) {
      await handleFailedSyncAttempt(session, err instanceof Error ? err.message : 'Upload failed')
    }
  }

  await syncStore.updatePendingCount()
  syncStore.setSyncing(false)
}

/**
 * Calculates exponential backoff retry timings on upload failures
 */
async function handleFailedSyncAttempt(session: SurveySession, errorMsg?: string): Promise<void> {
  const nextRetryCount = session.retry_count + 1
  
  // Calculate exponential delay (2^attempts seconds) plus random jitter
  const jitter = Math.floor(Math.random() * 1000)
  const backoffDelayMs = Math.min(Math.pow(2, nextRetryCount) * 1000 + jitter, 300000) // Caps at 5 minutes
  const nextRetryTime = new Date(Date.now() + backoffDelayMs).toISOString()

  await markSessionFailed(session.id, nextRetryCount, nextRetryTime)

  const syncStore = useSyncStore.getState()
  const errorText = errorMsg || 'Network dispatch failed'
  
  syncStore.addSyncLog(
    'failure', 
    `Sync failed for session ${session.session_id}. Retry ${nextRetryCount} in ${Math.round(backoffDelayMs / 1000)}s. Error: ${errorText}`
  )
  
  syncStore.setLastError(`Failed to sync session: ${errorText}`)
}

/**
 * Initializes listeners and schedules background timers.
 */
export function initSyncManager(): () => void {
  const syncStore = useSyncStore.getState()

  const handleOnline = () => {
    console.log('App detected online connection status.')
    syncStore.setOnline(true)
    runTranslationQueue()
    runSyncWorker() // Fire immediate execution on reconnect
  }

  const handleOffline = () => {
    console.log('App shifted to offline mode.')
    syncStore.setOnline(false)
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Trigger initial checks
  syncStore.setOnline(navigator.onLine)
  syncStore.updatePendingCount()

  if (navigator.onLine) {
    runTranslationQueue()
    runSyncWorker()
  }

  // Schedule periodic daemon
  syncIntervalId = setInterval(runSyncWorker, SYNC_INTERVAL_MS)
  translationIntervalId = setInterval(runTranslationQueue, TRANSLATION_INTERVAL_MS)

  // Return cleanup teardown function
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    if (syncIntervalId) {
      clearInterval(syncIntervalId)
    }
    if (translationIntervalId) {
      clearInterval(translationIntervalId)
    }
  }
}

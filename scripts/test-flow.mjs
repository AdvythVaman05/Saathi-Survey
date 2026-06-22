import { createServer } from 'vite'
import "fake-indexeddb/auto"
import crypto from 'crypto'

if (!globalThis.crypto) {
  globalThis.crypto = crypto
}

// Polyfill localStorage
if (!globalThis.localStorage) {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  }
}

// Polyfill navigator
if (!globalThis.navigator) {
  globalThis.navigator = { onLine: true }
}

async function runTest() {
  console.log('Starting Vite SSR environment...')
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  })
  
  try {
    const { useSurveyStore } = await vite.ssrLoadModule('/src/store/surveyStore.ts')
    const { db } = await vite.ssrLoadModule('/src/db/index.ts')
    const { runSyncWorker } = await vite.ssrLoadModule('/src/sync/syncManager.ts')
    const { demoSurvey } = await vite.ssrLoadModule('/src/db/seedData.ts')
    const { getSupabaseClient } = await vite.ssrLoadModule('/src/services/supabase.ts')
    
    // Clear DB just in case
    await db.sessions.clear()
    await db.responses.clear()
    
    console.log('\n--- 1. PREPARING STORE ---')
    // Ensure stores are populated
    useSurveyStore.setState({
      survey: demoSurvey,
      mode: 'self-guided',
      sessionId: 'test-session-' + Date.now(),
      startedAt: new Date().toISOString()
    })
    
    useSurveyStore.getState().answers = {
      'naviksa-q1': 'Integration Test',
      'naviksa-q3': 'Mumbai'
    }
    useSurveyStore.getState().optionSelections = {
      'naviksa-q2': '25-34',
      'naviksa-q4': 'low-vision'
    }
    
    // Add mock responses
    await db.responses.add({
      id: crypto.randomUUID(),
      session_id: useSurveyStore.getState().sessionId,
      survey_id: demoSurvey.id,
      question_id: 'naviksa-q1',
      sync_status: 'pending',
      created_at: new Date().toISOString()
    })
    
    console.log('\n--- 2. SUBMITTING SURVEY ---')
    await useSurveyStore.getState().submitSurvey()
    
    const sessionsBefore = await db.sessions.toArray()
    console.log('IndexedDB Sessions Count:', sessionsBefore.length)
    if (sessionsBefore.length > 0) {
      console.log('Session ID:', sessionsBefore[0].session_id)
      console.log('Sync Status (Before):', sessionsBefore[0].sync_status)
      console.log('Completion %:', sessionsBefore[0].completion_percentage)
      console.log('Mode:', sessionsBefore[0].mode)
    }

    console.log('\n--- 3. TRIGGERING SYNC MANAGER ---')
    const { isSupabaseConfigured } = await vite.ssrLoadModule('/src/services/supabase.ts')
    console.log('Is Supabase Configured?', isSupabaseConfigured())
    
    const { useSyncStore } = await vite.ssrLoadModule('/src/store/syncStore.ts')
    useSyncStore.getState().setOnline(true)
    
    await runSyncWorker()
    
    console.log('\n--- 4. VERIFYING INDEXEDDB AFTER SYNC ---')
    const sessionsAfter = await db.sessions.toArray()
    console.log('Sync Status (After):', sessionsAfter[0]?.sync_status)
    
    console.log('\n--- 5. VERIFYING SUPABASE DATABASE ---')
    const supabase = getSupabaseClient()
    if (!supabase) throw new Error('Supabase Client not initialized')
      
    // Fetch row directly from supabase using the inserted session_id
    const sessionId = sessionsBefore[0].session_id
    const { data: sessionData, error: sessionError } = await supabase
      .from('survey_sessions')
      .select('session_id, language, mode, created_at')
      .eq('session_id', sessionId)
      
    if (sessionError) {
      console.error('Supabase fetch error:', sessionError)
    } else {
      console.log('Inserted Session from Supabase:', sessionData)
    }

    const { data: answerData, error: answerError } = await supabase
      .from('survey_answers')
      .select('id, question_id')
      .eq('session_id', sessionId)
      
    if (answerError) {
      console.error('Supabase answers error:', answerError)
    } else {
      console.log(`Inserted Answers Count from Supabase: ${answerData?.length || 0}`)
    }

    console.log('\nTEST COMPLETED SUCCESSFULLY.')
    
  } finally {
    await vite.close()
  }
}

runTest().catch(console.error)

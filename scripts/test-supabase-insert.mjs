import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf8')
const envConfig = {}
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=')
  if (key && values.length > 0) {
    envConfig[key.trim()] = values.join('=').trim()
  }
})

const url = envConfig['VITE_SUPABASE_URL']
const key = envConfig['VITE_SUPABASE_ANON_KEY']
const supabase = createClient(url, key)

async function testSupabaseInsert() {
  console.log('Testing Supabase Insert/Upsert on survey_sessions...')

  const session = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      session_id: "test-session-123",
      survey_id: "demo-survey",
      participant_name: "Test",
      age_group: "18-24",
      location: "India",
      vision_type: "blind",
      language: "en",
      mode: "self-guided",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_seconds: 60,
      completion_percentage: 100,
      is_completed: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'synced'
  }

  console.log('Attempting Upsert...')
  const { data, error, status, statusText } = await supabase.from('survey_sessions').upsert(session, { onConflict: 'session_id' })
  
  if (error) {
    console.error('Upsert failed:', error)
  } else {
    console.log('Upsert succeeded:', { status, statusText, data })
  }

  console.log('Attempting pure Insert (without onConflict)...')
  const session2 = { ...session, id: "123e4567-e89b-12d3-a456-426614174001", session_id: "test-session-124" }
  const { data: data2, error: error2, status: status2, statusText: statusText2 } = await supabase.from('survey_sessions').insert(session2)
  if (error2) {
    console.error('Insert failed:', error2)
  } else {
    console.log('Insert succeeded:', { status: status2, statusText: statusText2, data: data2 })
  }
}

testSupabaseInsert()

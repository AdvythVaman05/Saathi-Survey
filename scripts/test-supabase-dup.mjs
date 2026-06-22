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

async function testSupabaseDuplicateInsert() {
  const session2 = { 
      id: "123e4567-e89b-12d3-a456-426614174001", 
      session_id: "test-session-124",
      survey_id: "demo-survey",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
  }
  const { error } = await supabase.from('survey_sessions').insert(session2)
  if (error) {
    console.error('Duplicate insert error code:', error.code)
    console.error('Duplicate insert error message:', error.message)
  } else {
    console.log('Duplicate insert succeeded (should not happen)')
  }
}

testSupabaseDuplicateInsert()

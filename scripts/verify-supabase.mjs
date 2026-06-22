import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Load .env.local manually
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

if (!url || !key) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(url, key)

async function testSupabase() {
  console.log('Testing Supabase Connection...')

  // Test sessions table
  console.log('Testing survey_sessions table...')
  const { data: sessionsData, error: sessionsError } = await supabase.from('survey_sessions').select('id').limit(1)
  if (sessionsError) {
    console.error('survey_sessions error:', sessionsError)
  } else {
    console.log('survey_sessions table OK. (Returned', sessionsData?.length || 0, 'rows due to RLS)')
  }

  // Test answers table
  console.log('Testing survey_answers table...')
  const { data: answersData, error: answersError } = await supabase.from('survey_answers').select('id').limit(1)
  if (answersError) {
    console.error('survey_answers error:', answersError)
  } else {
    console.log('survey_answers table OK. (Returned', answersData?.length || 0, 'rows due to RLS)')
  }
}

testSupabase()

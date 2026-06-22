-- Migration: Create survey_sessions and survey_answers tables with RLS

-- survey_sessions table
CREATE TABLE IF NOT EXISTS public.survey_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  survey_id text not null,
  participant_name text,
  age_group text,
  location text,
  vision_type text,
  language text,
  mode text,
  started_at timestamptz,
  completed_at timestamptz,
  duration_seconds integer,
  completion_percentage integer,
  is_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  sync_status text
);

-- survey_answers table
CREATE TABLE IF NOT EXISTS public.survey_answers (
  id uuid primary key default gen_random_uuid(),
  session_id text references public.survey_sessions(session_id) on delete cascade,
  survey_id text not null,
  question_id text not null,
  question_text text,
  question_type text,
  language text,
  response_text_original text,
  response_text_english text,
  audio_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  sync_status text
);

-- Enable RLS
ALTER TABLE public.survey_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

-- Policies for survey_sessions
-- Allow Anonymous INSERT
CREATE POLICY "Allow anonymous insert on survey_sessions"
  ON public.survey_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Deny Anonymous SELECT, UPDATE, DELETE (implicitly denied if no policy exists, but explicit is fine)
-- We just don't create policies for SELECT/UPDATE/DELETE for anon role.

-- Policies for survey_answers
-- Allow Anonymous INSERT
CREATE POLICY "Allow anonymous insert on survey_answers"
  ON public.survey_answers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

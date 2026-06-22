# SAATHI SURVEY

## Project Overview
SAATHI SURVEY is a fully offline-capable, voice-first web application designed specifically for blind and low-vision users to participate in accessibility research studies. The platform allows users to complete surveys autonomously using conversational AI, or via an assisted mode. Responses are securely cached in IndexedDB and synchronized to a cloud backend (Supabase) in the background.

## Features
- **Voice-First Interaction:** Fully functional using speech-to-text (STT) and text-to-speech (TTS) interfaces.
- **Offline First:** All data is captured securely to IndexedDB and synchronized transparently when an internet connection is available.
- **Background Sync Engine:** Automatically batches and pushes survey sessions to a remote Supabase instance.
- **Bilingual Support:** Supports both English and Hindi.
- **Accessible Design:** Minimalistic UI with high-contrast elements, screen-reader compatibility, and easy keyboard shortcuts.

## Accessibility Focus
The SAATHI SURVEY application is designed around maximum accessibility:
- Hands-free navigation through verbal commands.
- Automatic narration of all on-screen content.
- Intuitive keyboard shortcuts and clear visual states.
- Support for local dialects and languages (Hindi & English).

## Tech Stack
- **Frontend Framework:** React + Vite
- **Language:** TypeScript
- **State Management:** Zustand
- **Local Storage:** Dexie.js (IndexedDB)
- **Styling:** TailwindCSS
- **Speech APIs:** Web Speech API / Custom Voice Providers
- **Cloud Sync:** Supabase

## Local Setup Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/AdvythVaman05/Saathi-Survey.git
   cd Saathi-Survey
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (see below).
4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables
Create a `.env` file in the root directory and configure the following variables:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```
You can use the provided `.env.example` file as a template.

## Netlify Deployment Notes
This project is configured for deployment on Netlify.
- **Build Command:** `npm run build`
- **Publish Directory:** `dist`
- **Environment Variables:** Make sure to add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the Netlify Site Settings under Environment Variables.
- Ensure the Supabase backend has the `survey_sessions` and `survey_answers` tables along with their RLS policies applied (see `supabase/migrations`).

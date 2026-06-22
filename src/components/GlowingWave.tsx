import React from 'react'
import type { SpeechStatus } from '../types'

interface GlowingWaveProps {
  status: SpeechStatus
}

export const GlowingWave: React.FC<GlowingWaveProps> = ({ status }) => {
  return (
    <div className="flex flex-col items-center justify-center py-1 sm:py-2" aria-hidden="true">
      <div className="relative flex items-center justify-center w-28 h-28 sm:w-36 sm:h-36">

        {status === 'SPEAKING' && (
          <>
            <div className="absolute w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-sky-500/30 animate-pulse-ring" />
            <div className="absolute w-28 h-28 rounded-full border border-violet-500/20 animate-pulse-ring [animation-delay:1s]" />
          </>
        )}

        {status === 'LISTENING' && (
          <>
            <div className="absolute w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-emerald-400/40 animate-pulse-ring-fast" />
            <div className="absolute w-28 h-28 rounded-full border border-teal-500/30 animate-pulse-ring-fast [animation-delay:0.5s]" />
          </>
        )}

        {status === 'PROCESSING' && (
          <>
            <div className="absolute w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-amber-400/30 animate-spin-slow border-t-amber-400 border-r-amber-500/20" />
            <div className="absolute w-28 h-28 rounded-full border border-yellow-300/20 animate-spin-slow [animation-direction:reverse] [animation-duration:10s]" />
          </>
        )}

        <div
          className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-700 shadow-2xl ${
            status === 'SPEAKING'
              ? 'bg-gradient-to-tr from-sky-500 to-violet-600 scale-110 shadow-sky-500/30 animate-pulse-orb'
              : status === 'LISTENING'
              ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 scale-105 shadow-emerald-500/40 animate-pulse'
              : status === 'PROCESSING'
              ? 'bg-gradient-to-tr from-amber-500 to-yellow-600 scale-95 shadow-amber-500/30 animate-pulse'
              : 'bg-slate-800 border border-slate-700 shadow-black/50'
          }`}
        >
          <div className="text-2xl transition-transform duration-500">
            {status === 'SPEAKING' && '🗣️'}
            {status === 'LISTENING' && '🎙️'}
            {status === 'PROCESSING' && '⏳'}
            {status === 'PAUSED' && '⏸️'}
          </div>
        </div>

        <div
          className={`absolute w-32 h-32 rounded-full filter blur-3xl opacity-25 transition-all duration-1000 ${
            status === 'SPEAKING'
              ? 'bg-sky-500'
              : status === 'LISTENING'
              ? 'bg-emerald-400'
              : status === 'PROCESSING'
              ? 'bg-amber-400'
              : 'bg-slate-800'
          }`}
        />
      </div>

      <span className="sr-only">
        {status === 'SPEAKING' && 'Interviewer is speaking.'}
        {status === 'LISTENING' && 'Listening for your response.'}
        {status === 'PROCESSING' && 'Processing speech.'}
        {status === 'PAUSED' && 'Survey paused. Listening for resume.'}
      </span>
    </div>
  )
}
export default GlowingWave

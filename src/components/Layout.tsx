import React, { useEffect, useState } from 'react'
import { useSyncStore } from '../store/syncStore'
import { useLanguageStore } from '../store/languageStore'
import { ToastContainer } from './ToastContainer'

interface LayoutProps {
  children: React.ReactNode
  title?: string
  announcement?: string
}

export const Layout: React.FC<LayoutProps> = ({ children, title = 'SAATHI SURVEY', announcement = '' }) => {
  const { isOnline, pendingCount } = useSyncStore()
  const { language } = useLanguageStore()
  const [liveAnnouncement, setLiveAnnouncement] = useState('')

  useEffect(() => {
    if (announcement) {
      setLiveAnnouncement(announcement)
      const timer = setTimeout(() => setLiveAnnouncement(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [announcement])

  return (
    <div className="flex flex-col h-dvh bg-slate-950 text-slate-100 overflow-hidden font-sans">

      {/* Top Status Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900/60 border-b border-slate-800 backdrop-blur-md z-40 select-none flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label="Microphone Icon">🎙️</span>
          <h1 className="text-base font-extrabold tracking-wider bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold tracking-widest uppercase">
          {language && (
            <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-full">
              {language}
            </span>
          )}
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-violet-950 border border-violet-800 text-violet-300 rounded-full animate-pulse">
              Sync: {pendingCount}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-rose-500 shadow-md shadow-rose-500/50'}`}
              aria-hidden="true"
            />
            <span className={isOnline ? 'text-emerald-400' : 'text-rose-400'}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area - no scrolling, fits viewport */}
      <main className="flex-1 overflow-hidden px-4 py-2 flex flex-col justify-center max-w-4xl mx-auto w-full z-10">
        {children}
      </main>

      <ToastContainer />

      {/* Screen Reader Live Announcements */}
      <div
        className="sr-only"
        role="status"
        aria-live="assertive"
        aria-atomic="true"
      >
        {liveAnnouncement}
      </div>
    </div>
  )
}
export default Layout

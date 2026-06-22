import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { seedLocalData } from './db/seedData'
import { initSyncManager } from './sync/syncManager'

// Initialize Dexie Seed Data
seedLocalData()
  .then(() => {
    console.log('Local IndexedDB seeded successfully.')
    // Initialize Sync Daemon
    initSyncManager()
  })
  .catch((err) => console.error('IndexedDB seeding failed:', err))

// Register Service Worker for offline PWA capabilities
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('ServiceWorker registered successfully with scope:', reg.scope))
      .catch((err) => console.error('ServiceWorker registration failed:', err))
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

import { create } from 'zustand'
import type { SyncLog } from '../types'
import { getPendingSessions } from '../db'

interface SyncState {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  syncLogs: SyncLog[]
  lastSyncAt: string | null
  lastError: string | null

  setOnline: (online: boolean) => void
  setSyncing: (syncing: boolean) => void
  updatePendingCount: () => Promise<void>
  addSyncLog: (type: 'success' | 'failure', message: string) => void
  setLastError: (error: string | null) => void
  resetSyncStore: () => void
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  syncLogs: [],
  lastSyncAt: null,
  lastError: null,

  setOnline: (isOnline) => set({ isOnline }),
  
  setSyncing: (isSyncing) => {
    set({ isSyncing })
    if (!isSyncing) {
      set({ lastSyncAt: new Date().toISOString() })
    }
  },

  updatePendingCount: async () => {
    const pending = await getPendingSessions()
    set({ pendingCount: pending.length })
  },

  addSyncLog: (type, message) => {
    const newLog: SyncLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      message
    }
    set((state) => ({
      syncLogs: [newLog, ...state.syncLogs].slice(0, 100) // Keep last 100 logs
    }))
  },

  setLastError: (lastError) => set({ lastError }),

  resetSyncStore: () => {
    set({
      isSyncing: false,
      pendingCount: 0,
      syncLogs: [],
      lastSyncAt: null,
      lastError: null
    })
  }
}))

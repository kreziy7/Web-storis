import { create } from 'zustand';

export const useSyncStore = create((set) => ({
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    syncError: null,

    setIsSyncing: (value) => set({ isSyncing: value }),
    setPendingCount: (count) => set({ pendingCount: count }),
    setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
    setSyncError: (error) => set({ syncError: error }),
}));

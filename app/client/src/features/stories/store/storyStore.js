import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { storyApi } from '../api/storyApi';
import { initDB } from '../../../db/db';
import { syncEngine } from '../../../sync/syncEngine';

export const useStoryStore = create((set, get) => ({
    stories: [],
    isLoading: false,
    error: null,

    fetchStories: async () => {
        set({ isLoading: true, error: null });
        try {
            // 1. Load from IndexedDB first (Offline fallback)
            const db = await initDB();
            const localStories = await db.getAll('stories');
            set({ stories: localStories.filter(s => !s.isDeleted) });

            // 2. Fetch from server if online
            if (navigator.onLine) {
                const serverStories = await storyApi.getAll();

                // Update local DB with server data
                const tx = db.transaction('stories', 'readwrite');
                for (const story of serverStories) {
                    await tx.store.put({ ...story, id: story._id, isSynced: true });
                }
                await tx.done;

                set({ stories: serverStories });
            }
        } catch (err) {
            set({ error: err.message });
            console.error('Fetch stories error:', err);
        } finally {
            set({ isLoading: false });
        }
    },

    createStory: async (data) => {
        const tempId = uuidv4();
        const newStory = {
            id: tempId,
            clientId: tempId,
            title: data.title,
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType || 'image',
            createdAt: new Date().toISOString(),
            isSynced: false,
            isDeleted: false
        };

        // Optimistic Update
        set(state => ({ stories: [newStory, ...state.stories] }));

        const db = await initDB();
        await db.put('stories', newStory);

        if (navigator.onLine) {
            try {
                const saved = await storyApi.create(data);
                const syncedStory = { ...saved, id: saved._id, isSynced: true };

                // Update local DB with real server ID
                await db.delete('stories', tempId);
                await db.put('stories', syncedStory);

                set(state => ({
                    stories: state.stories.map(s => s.id === tempId ? syncedStory : s)
                }));
            } catch (err) {
                // Fallback to queue if request fails
                await db.put('syncQueue', { type: 'CREATE', payload: data, timestamp: Date.now() });
            }
        } else {
            // Add to sync queue if offline
            await db.put('syncQueue', { type: 'CREATE', payload: data, timestamp: Date.now() });
        }
    },

    deleteStory: async (id) => {
        const existing = get().stories.find(s => s.id === id);
        if (!existing) return;

        // Optimistic Update
        set(state => ({ stories: state.stories.filter(s => s.id !== id) }));

        const db = await initDB();
        await db.put('stories', { ...existing, isDeleted: true });

        if (navigator.onLine) {
            try {
                await storyApi.delete(id);
                await db.delete('stories', id);
            } catch (err) {
                await db.put('syncQueue', { type: 'DELETE', payload: { id }, timestamp: Date.now() });
            }
        } else {
            await db.put('syncQueue', { type: 'DELETE', payload: { id }, timestamp: Date.now() });
        }
    }
}));

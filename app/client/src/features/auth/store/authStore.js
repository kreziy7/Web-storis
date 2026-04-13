import { create } from 'zustand';
import { authApi } from '../api/authApi';
import { remindersDb } from '../../../db/remindersDb';
import { syncQueueDb } from '../../../db/syncQueueDb';
import { metaDb } from '../../../db/metaDb';

const USER_KEY = 'sr_user';

// accessToken lives in memory only (AUTH-06) — never persisted to localStorage
const saveUser = (user) => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
};

const loadUser = () => {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
        return null;
    }
};

export const useAuthStore = create((set, get) => ({
    user: loadUser(),
    accessToken: null,          // in memory only
    isAuthenticated: false,     // becomes true after successful login / refresh
    isInitializing: true,       // true while startup refresh is in progress
    isLoading: false,
    error: null,
    isDemo: false,

    get isAdmin() { return get().user?.role === 'admin'; },

    // Called once on app startup — tries to restore session via refresh token cookie
    initialize: async () => {
        const storedUser = loadUser();
        if (!storedUser) {
            set({ isInitializing: false });
            return;
        }
        try {
            const data = await authApi.refresh();
            set({
                user: storedUser,
                accessToken: data.accessToken,
                isAuthenticated: true,
                isInitializing: false,
            });
        } catch {
            // Refresh token expired / invalid — clear session
            saveUser(null);
            set({ user: null, accessToken: null, isAuthenticated: false, isInitializing: false });
        }
    },

    setAccessToken: (token) => {
        set({ accessToken: token, isAuthenticated: !!token });
    },

    setUser: (user) => set({ user }),

    login: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const result = await authApi.login(data);
            saveUser(result.user);
            set({
                user: result.user,
                accessToken: result.accessToken,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            set({
                error: error.response?.data?.message || 'Login failed',
                isLoading: false,
            });
            throw error;
        }
    },

    register: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const result = await authApi.register(data);
            saveUser(result.user);
            set({
                user: result.user,
                accessToken: result.accessToken,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            set({
                error: error.response?.data?.message || 'Registration failed',
                isLoading: false,
            });
            throw error;
        }
    },

    loginAsDemo: () => {
        // Pure in-memory session — no API call, no localStorage
        set({
            user: { id: 'demo', name: 'Demo User', email: 'demo@example.com' },
            accessToken: 'demo',
            isAuthenticated: true,
            isDemo: true,
            isLoading: false,
            error: null,
        });
    },

    logout: async () => {
        const { isDemo } = get();
        if (!isDemo) {
            try {
                await authApi.logout();
            } catch (err) {
                console.error('Logout error:', err);
            }
        }
        saveUser(null);
        set({ user: null, accessToken: null, isAuthenticated: false, isDemo: false });
        if (!isDemo) {
            // Clear all local data so next user starts clean
            await Promise.all([
                remindersDb.clear(),
                syncQueueDb.clear(),
                metaDb.clear(),
            ]);
        }
        // Reset in-memory stores (lazy import to avoid circular deps)
        const { useReminderStore } = await import('../../reminders/store/reminderStore');
        const { useSyncStore } = await import('../../../store/syncStore');
        useReminderStore.getState().reset();
        useSyncStore.getState().setPendingCount(0);
        useSyncStore.getState().setLastSyncAt(null);
    },

    refreshAccessToken: async () => {
        try {
            const data = await authApi.refresh();
            const currentUser = get().user;
            set({ accessToken: data.accessToken, isAuthenticated: true });
            return data.accessToken;
        } catch (error) {
            saveUser(null);
            set({ user: null, accessToken: null, isAuthenticated: false });
            throw error;
        }
    },

    clearError: () => set({ error: null }),
}));

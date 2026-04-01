import { create } from 'zustand';
import { authApi } from '../api/authApi';

export const useAuthStore = create((set, get) => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    setAccessToken: (token) =>
        set({ accessToken: token, isAuthenticated: !!token }),

    setUser: (user) => set({ user }),

    login: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authApi.login(data);
            set({
                user: response.user,
                accessToken: response.accessToken,
                isAuthenticated: true,
                isLoading: false
            });
        } catch (error) {
            set({
                error: error.response?.data?.message || 'Login failed',
                isLoading: false
            });
            throw error;
        }
    },

    register: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authApi.register(data);
            set({
                user: response.user,
                accessToken: response.accessToken,
                isAuthenticated: true,
                isLoading: false
            });
        } catch (error) {
            set({
                error: error.response?.data?.message || 'Registration failed',
                isLoading: false
            });
            throw error;
        }
    },

    logout: async () => {
        try {
            await authApi.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            set({ user: null, accessToken: null, isAuthenticated: false });
        }
    },

    refreshAccessToken: async () => {
        try {
            const response = await authApi.refresh();
            set({
                accessToken: response.accessToken,
                user: response.user,
                isAuthenticated: true
            });
            return response.accessToken;
        } catch (error) {
            set({ user: null, accessToken: null, isAuthenticated: false });
            throw error;
        }
    }
}));

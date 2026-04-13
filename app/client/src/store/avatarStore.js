import { create } from 'zustand';

const AVATAR_KEY = 'sr_avatar';

const loadAvatar = () => {
    try { return localStorage.getItem(AVATAR_KEY) || null; } catch { return null; }
};

export const useAvatarStore = create((set) => ({
    avatarUrl: loadAvatar(),

    setAvatar: (dataUrl) => {
        try { localStorage.setItem(AVATAR_KEY, dataUrl); } catch { /* storage full */ }
        set({ avatarUrl: dataUrl });
    },

    removeAvatar: () => {
        try { localStorage.removeItem(AVATAR_KEY); } catch { }
        set({ avatarUrl: null });
    },
}));

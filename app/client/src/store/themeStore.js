import { create } from 'zustand';

const THEME_KEY = 'sr_theme';

export const themes = {
    forest: {
        id: 'forest',
        name: 'Forest',
        emoji: '🌿',
        '--primary':          '#408A71',
        '--primary-hover':    '#357a63',
        '--primary-dim':      'rgba(64,138,113,0.14)',
        '--bg-main':          '#c8e6d4',
        '--bg-card':          '#1a3d2e',
        '--bg-elevated':      '#1f4a37',
        '--bg-input':         '#22503a',
        '--bg-header':        'rgba(200,230,212,0.92)',
        '--bg-footer':        'rgba(200,230,212,0.75)',
        '--text-main':        '#d4efe3',
        '--text-muted':       '#7ab99a',
        '--text-on-bg':       '#0d2b1e',
        '--text-muted-on-bg': '#2d6b4e',
        '--border':           'rgba(64,138,113,0.35)',
        '--border-subtle':    'rgba(64,138,113,0.2)',
    },
    ocean: {
        id: 'ocean',
        name: 'Ocean',
        emoji: '🌊',
        '--primary':          '#2563eb',
        '--primary-hover':    '#1d4ed8',
        '--primary-dim':      'rgba(37,99,235,0.14)',
        '--bg-main':          '#c7d9f5',
        '--bg-card':          '#1e3a6e',
        '--bg-elevated':      '#243f78',
        '--bg-input':         '#284a80',
        '--bg-header':        'rgba(199,217,245,0.92)',
        '--bg-footer':        'rgba(199,217,245,0.75)',
        '--text-main':        '#dde8fb',
        '--text-muted':       '#7fa8e8',
        '--text-on-bg':       '#0d1f4a',
        '--text-muted-on-bg': '#1a4080',
        '--border':           'rgba(37,99,235,0.35)',
        '--border-subtle':    'rgba(37,99,235,0.2)',
    },
    midnight: {
        id: 'midnight',
        name: 'Midnight',
        emoji: '🌙',
        '--primary':          '#a78bfa',
        '--primary-hover':    '#9574f0',
        '--primary-dim':      'rgba(167,139,250,0.14)',
        '--bg-main':          '#13111c',
        '--bg-card':          '#1e1b2e',
        '--bg-elevated':      '#242038',
        '--bg-input':         '#2a2640',
        '--bg-header':        'rgba(19,17,28,0.94)',
        '--bg-footer':        'rgba(19,17,28,0.94)',
        '--text-main':        '#e8e3f8',
        '--text-muted':       '#8b7ec8',
        '--text-on-bg':       '#e8e3f8',
        '--text-muted-on-bg': '#8b7ec8',
        '--text-dim':         '#5a5090',
        '--border':           'rgba(167,139,250,0.3)',
        '--border-subtle':    'rgba(167,139,250,0.15)',
    },
    sakura: {
        id: 'sakura',
        name: 'Sakura',
        emoji: '🌸',
        '--primary':          '#e4608a',
        '--primary-hover':    '#d04f78',
        '--primary-dim':      'rgba(228,96,138,0.14)',
        '--bg-main':          '#fce4ec',
        '--bg-card':          '#3d1a26',
        '--bg-elevated':      '#4a2030',
        '--bg-input':         '#4f2232',
        '--bg-header':        'rgba(252,228,236,0.92)',
        '--bg-footer':        'rgba(252,228,236,0.75)',
        '--text-main':        '#fce4ec',
        '--text-muted':       '#e09eb5',
        '--text-on-bg':       '#3d0a1a',
        '--text-muted-on-bg': '#8b3054',
        '--border':           'rgba(228,96,138,0.35)',
        '--border-subtle':    'rgba(228,96,138,0.2)',
    },
    desert: {
        id: 'desert',
        name: 'Desert',
        emoji: '🏜️',
        '--primary':          '#d97706',
        '--primary-hover':    '#b45309',
        '--primary-dim':      'rgba(217,119,6,0.14)',
        '--bg-main':          '#fef3c7',
        '--bg-card':          '#3d2a0a',
        '--bg-elevated':      '#4a3412',
        '--bg-input':         '#523a14',
        '--bg-header':        'rgba(254,243,199,0.92)',
        '--bg-footer':        'rgba(254,243,199,0.75)',
        '--text-main':        '#fef3c7',
        '--text-muted':       '#d4a96a',
        '--text-on-bg':       '#2c1a00',
        '--text-muted-on-bg': '#7a4e10',
        '--border':           'rgba(217,119,6,0.35)',
        '--border-subtle':    'rgba(217,119,6,0.2)',
    },
};

export function applyTheme(theme) {
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
        if (key.startsWith('--')) root.style.setProperty(key, value);
    });
}

// Apply saved theme immediately (before first render)
const savedId = localStorage.getItem(THEME_KEY) || 'forest';
applyTheme(themes[savedId] || themes.forest);

export const useThemeStore = create((set) => ({
    currentTheme: savedId,
    setTheme: (id) => {
        const theme = themes[id];
        if (!theme) return;
        applyTheme(theme);
        localStorage.setItem(THEME_KEY, id);
        set({ currentTheme: id });
    },
}));

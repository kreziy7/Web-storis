import { create } from 'zustand';

const LANGS = [
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'ru', label: 'RU', flag: '🇷🇺' },
  { code: 'uz', label: 'UZ', flag: '🇺🇿' },
];

const saved = localStorage.getItem('lang');
const initial = LANGS.find(l => l.code === saved) ? saved : 'en';

export const useLanguageStore = create((set) => ({
  lang: initial,
  langs: LANGS,
  setLang: (code) => {
    localStorage.setItem('lang', code);
    set({ lang: code });
  },
}));

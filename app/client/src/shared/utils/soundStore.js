const PREF_KEY  = 'sr_sound_pref';
const AUDIO_KEY = 'sr_sound_audio';

export const SOUND_TYPES = { DEFAULT: 'default', RANDOM: 'random', CUSTOM: 'custom' };

export function getSoundPref() {
    try {
        const raw = localStorage.getItem(PREF_KEY);
        return raw ? JSON.parse(raw) : { type: SOUND_TYPES.DEFAULT, presetId: 'classic' };
    } catch {
        return { type: SOUND_TYPES.DEFAULT, presetId: 'classic' };
    }
}

export function setSoundPref(pref) {
    localStorage.setItem(PREF_KEY, JSON.stringify(pref));
}

export function saveCustomAudio(dataUrl, name, duration) {
    try {
        localStorage.setItem(AUDIO_KEY, dataUrl);
        setSoundPref({ type: SOUND_TYPES.CUSTOM, fileName: name, duration });
        return true;
    } catch (e) {
        // localStorage full
        return false;
    }
}

export function getCustomAudio() {
    return localStorage.getItem(AUDIO_KEY);
}

export function clearCustomAudio() {
    localStorage.removeItem(AUDIO_KEY);
}

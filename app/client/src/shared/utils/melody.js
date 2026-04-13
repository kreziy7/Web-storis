/**
 * melody.js — plays reminder sounds.
 * Reads sound preference from localStorage directly (no external imports)
 * so this module always loads safely even if soundStore has issues.
 */

// Must match keys in soundStore.js
const _PREF_KEY   = 'sr_sound_pref';
const _AUDIO_KEY  = 'sr_sound_audio';

function _readPref() {
    try {
        const raw = localStorage.getItem(_PREF_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function _readCustomAudio() {
    try { return localStorage.getItem(_AUDIO_KEY); } catch { return null; }
}

// ── Melody presets ─────────────────────────────────────────
export const MELODY_PRESETS = [
    {
        id: 'classic', name: 'Classic', emoji: '🎵',
        notes: [
            { freq: 523.25, start: 0.00, dur: 0.55 },
            { freq: 659.25, start: 0.40, dur: 0.55 },
            { freq: 783.99, start: 0.80, dur: 0.55 },
            { freq: 1046.5, start: 1.20, dur: 0.80 },
            { freq: 783.99, start: 1.90, dur: 0.45 },
            { freq: 659.25, start: 2.30, dur: 0.45 },
            { freq: 523.25, start: 2.70, dur: 1.00 },
        ],
    },
    {
        id: 'chime', name: 'Chime', emoji: '🔔',
        notes: [
            { freq: 880.00,  start: 0.00, dur: 0.50 },
            { freq: 1108.73, start: 0.35, dur: 0.50 },
            { freq: 1318.51, start: 0.70, dur: 0.90 },
        ],
    },
    {
        id: 'soft', name: 'Soft', emoji: '🌸',
        notes: [
            { freq: 392.00, start: 0.0, dur: 0.9 },
            { freq: 493.88, start: 0.7, dur: 0.9 },
            { freq: 587.33, start: 1.4, dur: 1.3 },
        ],
    },
    {
        id: 'alert', name: 'Alert', emoji: '⚡',
        notes: [
            { freq: 880,  start: 0.00, dur: 0.15 },
            { freq: 880,  start: 0.20, dur: 0.15 },
            { freq: 1320, start: 0.40, dur: 0.55 },
        ],
    },
    {
        id: 'gentle', name: 'Gentle', emoji: '✨',
        notes: [
            { freq: 523.25, start: 0.0, dur: 0.7 },
            { freq: 698.46, start: 0.6, dur: 0.7 },
            { freq: 880.00, start: 1.2, dur: 1.2 },
        ],
    },
];

// ── Shared AudioContext (singleton) ───────────────────────
// Chrome blocks audio until user interacts with the page.
// Solution: create one context, unlock it on first user gesture,
// then reuse it for all subsequent playbacks — even from setTimeout.
let _sharedCtx = null;
let _unlocked  = false;

function _getCtx() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!_sharedCtx || _sharedCtx.state === 'closed') {
        _sharedCtx = new AudioCtx();
    }
    return _sharedCtx;
}

// Call resume() — needed after Chrome blocks autoplay
function _ensureUnlocked(ctx) {
    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }
}

// Unlock on ANY user gesture (click, keydown, touchstart)
// This runs once at module load — after first tap/click audio works everywhere
function _setupUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
        if (_unlocked) return;
        const ctx = _getCtx();
        if (!ctx) return;
        ctx.resume().then(() => {
            _unlocked = true;
        }).catch(() => {});
    };
    ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(evt =>
        window.addEventListener(evt, unlock, { once: false, passive: true })
    );
}
_setupUnlock();

// ── Core note renderer ─────────────────────────────────────
function _playNotes(notes) {
    try {
        const ctx = _getCtx();
        if (!ctx) return;

        _ensureUnlocked(ctx);

        const play = () => {
            notes.forEach(({ freq, start, dur }) => {
                const osc  = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = freq;
                const t = ctx.currentTime + start;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.35, t + 0.06); // louder: 0.22→0.35
                gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
                osc.start(t);
                osc.stop(t + dur + 0.05);
            });
        };

        if (ctx.state === 'running') {
            play();
        } else {
            // Wait for resume then play
            ctx.resume().then(play).catch(() => {});
        }
    } catch { /* silent fail */ }
}

// ── Play custom audio (max 20 s) ───────────────────────────
export function playCustomSound(dataUrl, maxSeconds = 5) {
    try {
        const audio  = new Audio(dataUrl);
        audio.volume = 0.85;
        const stopId = setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
        }, maxSeconds * 1000);
        audio.onended = () => clearTimeout(stopId);
        audio.play().catch(() => {});
        return audio;
    } catch { /* silent fail */ }
}

// ── Preview a preset by id ─────────────────────────────────
export function playPreset(presetId) {
    const preset = MELODY_PRESETS.find(p => p.id === presetId) || MELODY_PRESETS[0];
    _playNotes(preset.notes);
}

// ── Main function called by notifications ──────────────────
export function playReminderMelody() {
    // 1. Read preference (safe — own try/catch)
    const pref = _readPref();

    // 2. Custom uploaded sound
    if (pref?.type === 'custom') {
        const dataUrl = _readCustomAudio();
        if (dataUrl) {
            playCustomSound(dataUrl);
            return;
        }
        // No audio stored → fall through to default
    }

    // 3. Random preset
    if (pref?.type === 'random') {
        const preset = MELODY_PRESETS[Math.floor(Math.random() * MELODY_PRESETS.length)];
        _playNotes(preset.notes);
        return;
    }

    // 4. Specific preset (or default classic)
    const presetId = pref?.presetId || 'classic';
    const preset   = MELODY_PRESETS.find(p => p.id === presetId) || MELODY_PRESETS[0];
    _playNotes(preset.notes);
}

// ── Trim audio file to maxSeconds ──────────────────────────
export async function trimAudioFile(file, maxSeconds = 5) {
    const arrayBuffer = await file.arrayBuffer();

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx      = new AudioCtx();

    let decoded;
    try {
        decoded = await new Promise((resolve, reject) =>
            ctx.decodeAudioData(arrayBuffer, resolve, reject)
        );
    } finally {
        ctx.close().catch(() => {});
    }

    // No trimming needed — return original file as data URL
    if (decoded.duration <= maxSeconds) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = e => resolve({ dataUrl: e.target.result, duration: decoded.duration });
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Trim via OfflineAudioContext → WAV
    const sampleRate  = decoded.sampleRate;
    const frameCount  = Math.floor(maxSeconds * sampleRate);
    const offCtx      = new OfflineAudioContext(decoded.numberOfChannels, frameCount, sampleRate);
    const source      = offCtx.createBufferSource();
    source.buffer     = decoded;
    source.connect(offCtx.destination);
    source.start(0);
    const trimmed     = await offCtx.startRendering();
    const dataUrl     = _audioBufferToWav(trimmed);
    return { dataUrl, duration: maxSeconds };
}

// ── AudioBuffer → WAV data URL ─────────────────────────────
function _audioBufferToWav(buffer) {
    const numCh   = buffer.numberOfChannels;
    const sr      = buffer.sampleRate;
    const len     = buffer.length;
    const bps     = 16;
    const bytesPs = sr * numCh * bps / 8;
    const block   = numCh * bps / 8;
    const dataSz  = len * numCh * bps / 8;
    const ab      = new ArrayBuffer(44 + dataSz);
    const v       = new DataView(ab);

    const ws = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); v.setUint32(4, 36 + dataSz, true); ws(8, 'WAVE');
    ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, numCh, true); v.setUint32(24, sr, true);
    v.setUint32(28, bytesPs, true); v.setUint16(32, block, true); v.setUint16(34, bps, true);
    ws(36, 'data'); v.setUint32(40, dataSz, true);

    let off = 44;
    for (let i = 0; i < len; i++) {
        for (let ch = 0; ch < numCh; ch++) {
            const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
            v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
            off += 2;
        }
    }

    const bytes = new Uint8Array(ab);
    let bin = '';
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    return 'data:audio/wav;base64,' + btoa(bin);
}

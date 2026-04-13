import React, { useState, useRef, useCallback } from 'react';
import {
    Music2, Upload, Shuffle, Play, RotateCcw,
    CheckCircle2, AlertCircle, Loader2, FileAudio,
} from 'lucide-react';
import { MELODY_PRESETS, playPreset, playCustomSound, trimAudioFile } from '../../../shared/utils/melody';
import {
    SOUND_TYPES, getSoundPref, setSoundPref,
    saveCustomAudio, getCustomAudio, clearCustomAudio,
} from '../../../shared/utils/soundStore';
import './SoundSettings.css';

const MAX_SECONDS  = 10;
const MAX_FILE_MB  = 5;

export const SoundSettings = () => {
    const [pref, setPref]         = useState(() => getSoundPref());
    const [status, setStatus]     = useState(null);   // { type: 'success'|'error'|'info', msg }
    const [processing, setProc]   = useState(false);
    const [dragging, setDragging] = useState(false);
    const fileInputRef            = useRef(null);

    const save = useCallback((newPref) => {
        setSoundPref(newPref);
        setPref(newPref);
    }, []);

    // ── Preset select ─────────────────────────────────────
    const selectPreset = (id) => {
        save({ type: SOUND_TYPES.DEFAULT, presetId: id });
        setStatus(null);
    };

    // ── Random ────────────────────────────────────────────
    const selectRandom = () => {
        save({ type: SOUND_TYPES.RANDOM });
        setStatus({ type: 'info', msg: 'Each notification plays a random melody.' });
    };

    // ── Preview current ───────────────────────────────────
    const previewCurrent = () => {
        if (pref.type === SOUND_TYPES.CUSTOM) {
            const url = getCustomAudio();
            if (url) playCustomSound(url, MAX_SECONDS);
        } else if (pref.type === SOUND_TYPES.RANDOM) {
            const rnd = MELODY_PRESETS[Math.floor(Math.random() * MELODY_PRESETS.length)];
            playPreset(rnd.id);
        } else {
            playPreset(pref.presetId || 'classic');
        }
    };

    // ── Reset to default ──────────────────────────────────
    const resetDefault = () => {
        clearCustomAudio();
        save({ type: SOUND_TYPES.DEFAULT, presetId: 'classic' });
        setStatus(null);
    };

    // ── Process uploaded file ─────────────────────────────
    const processFile = async (file) => {
        if (!file) return;

        const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav',
                              'audio/aac', 'audio/flac', 'audio/m4a', 'audio/x-m4a'];
        if (!file.type.startsWith('audio/') && !allowedTypes.includes(file.type)) {
            setStatus({ type: 'error', msg: 'Only audio files are supported (mp3, wav, ogg…)' });
            return;
        }

        if (file.size > MAX_FILE_MB * 1024 * 1024) {
            setStatus({ type: 'error', msg: `File too large. Maximum ${MAX_FILE_MB} MB.` });
            return;
        }

        setProc(true);
        setStatus(null);

        try {
            const { dataUrl, duration } = await trimAudioFile(file, MAX_SECONDS);
            const trimmed = duration < file.size && duration >= MAX_SECONDS; // was trimmed?
            const saved   = saveCustomAudio(dataUrl, file.name, Math.round(duration * 10) / 10);

            if (!saved) {
                setStatus({ type: 'error', msg: 'Could not save: storage full. Try a smaller file.' });
                return;
            }

            setPref(getSoundPref());
            setStatus({
                type: 'success',
                msg: `"${file.name}" saved (${Math.round(duration * 10) / 10}s)` +
                     (duration >= MAX_SECONDS ? ' — trimmed to 20 seconds.' : '.'),
            });
        } catch (e) {
            setStatus({ type: 'error', msg: 'Could not decode audio. Try another file.' });
        } finally {
            setProc(false);
        }
    };

    const onFileInput = (e) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
        e.target.value = '';
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    const isActiveType   = (t)  => pref.type === t;
    const isActivePreset = (id) => pref.type === SOUND_TYPES.DEFAULT && pref.presetId === id;

    return (
        <div className="sound-settings">
            {/* ── Title ── */}
            <div className="sound-title-row">
                <Music2 size={16} />
                <h3 className="sound-title">Notification Sound</h3>
                <button className="sound-preview-btn" onClick={previewCurrent} title="Preview current sound">
                    <Play size={13} /> Preview
                </button>
            </div>
            <p className="sound-desc">Choose a melody that plays when a reminder is due.</p>

            {/* ── Source tabs ── */}
            <div className="sound-source-tabs">
                <button
                    className={`sound-tab ${isActiveType(SOUND_TYPES.DEFAULT) ? 'sound-tab-active' : ''}`}
                    onClick={() => save({ type: SOUND_TYPES.DEFAULT, presetId: pref.presetId || 'classic' })}
                >
                    🎵 Presets
                </button>
                <button
                    className={`sound-tab ${isActiveType(SOUND_TYPES.RANDOM) ? 'sound-tab-active' : ''}`}
                    onClick={selectRandom}
                >
                    <Shuffle size={13} /> Random
                </button>
                <button
                    className={`sound-tab ${isActiveType(SOUND_TYPES.CUSTOM) ? 'sound-tab-active' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload size={13} /> My file
                </button>
            </div>

            {/* ── Preset grid ── */}
            {isActiveType(SOUND_TYPES.DEFAULT) && (
                <div className="sound-preset-grid">
                    {MELODY_PRESETS.map(p => (
                        <button
                            key={p.id}
                            className={`sound-preset-btn ${isActivePreset(p.id) ? 'sound-preset-active' : ''}`}
                            onClick={() => { selectPreset(p.id); playPreset(p.id); }}
                        >
                            <span className="preset-emoji">{p.emoji}</span>
                            <span className="preset-name">{p.name}</span>
                            {isActivePreset(p.id) && <CheckCircle2 size={12} className="preset-check" />}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Random info ── */}
            {isActiveType(SOUND_TYPES.RANDOM) && (
                <div className="sound-random-info">
                    <Shuffle size={14} />
                    Each notification plays a random melody from the presets above.
                </div>
            )}

            {/* ── Custom file zone ── */}
            {isActiveType(SOUND_TYPES.CUSTOM) && (
                <div
                    className={`sound-drop-zone ${dragging ? 'drop-zone-active' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {processing ? (
                        <><Loader2 size={20} className="spin-icon" /> Processing audio…</>
                    ) : pref.fileName ? (
                        <>
                            <FileAudio size={20} />
                            <span className="drop-filename">{pref.fileName}</span>
                            <span className="drop-duration">{pref.duration}s</span>
                            <span className="drop-hint">Click or drag to replace</span>
                        </>
                    ) : (
                        <>
                            <Upload size={20} />
                            <span>Click or drag an audio file here</span>
                            <span className="drop-hint">mp3, wav, ogg · max {MAX_FILE_MB} MB · auto-trimmed to {MAX_SECONDS}s</span>
                        </>
                    )}
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={onFileInput}
            />

            {/* ── Status message ── */}
            {status && (
                <div className={`sound-status sound-status-${status.type}`}>
                    {status.type === 'error'   && <AlertCircle size={13} />}
                    {status.type === 'success' && <CheckCircle2 size={13} />}
                    {status.msg}
                </div>
            )}

            {/* ── Reset ── */}
            {(pref.type !== SOUND_TYPES.DEFAULT || pref.presetId !== 'classic') && (
                <button className="sound-reset-btn" onClick={resetDefault}>
                    <RotateCcw size={12} /> Reset to default
                </button>
            )}
        </div>
    );
};

export default SoundSettings;

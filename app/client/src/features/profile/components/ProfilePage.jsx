import React, { useState, useRef } from 'react';
import { useAuthStore } from '../../auth/store/authStore';
import { profileApi } from '../api/profileApi';
import { useThemeStore, themes } from '../../../store/themeStore';
import { useLanguageStore } from '../../../store/languageStore';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useAvatarStore } from '../../../store/avatarStore';
import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';
import { SoundSettings } from './SoundSettings';
import './ProfilePage.css';

// ── Theme Picker ──────────────────────────────────────────
const ThemePicker = () => {
    const { currentTheme, setTheme } = useThemeStore();
    return (
        <div className="theme-picker">
            {Object.values(themes).map(t => (
                <button
                    key={t.id}
                    className={`theme-swatch ${currentTheme === t.id ? 'active' : ''}`}
                    style={{ background: t['--bg-card'], borderColor: t['--primary'] }}
                    onClick={() => setTheme(t.id)}
                    title={t.name}
                >
                    <span className="swatch-dot" style={{ background: t['--primary'] }} />
                    <span className="swatch-label">{t.emoji} {t.name}</span>
                    {currentTheme === t.id && <span className="swatch-check">✓</span>}
                </button>
            ))}
        </div>
    );
};

// ── Language Picker ───────────────────────────────────────
const LanguagePicker = () => {
    const { lang, langs, setLang } = useLanguageStore();
    return (
        <div className="lang-picker">
            {langs.map(l => (
                <button
                    key={l.code}
                    className={`lang-btn ${lang === l.code ? 'lang-active' : ''}`}
                    onClick={() => setLang(l.code)}
                >
                    {l.flag} {l.label}
                </button>
            ))}
        </div>
    );
};

// ── Edit Profile Form ─────────────────────────────────────
const EditProfileForm = () => {
    const { user, setUser } = useAuthStore();
    const { t } = useTranslation();
    const p = t.profile;
    const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', currentPassword: '' });
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState(null);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.id]: e.target.value }));
        setErrors(prev => ({ ...prev, [e.target.id]: '' }));
        setStatus(null);
    };

    const validate = () => {
        const errs = {};
        if (!form.name.trim()) errs.name = p.nameRequired;
        if (!form.email.trim()) errs.email = p.emailRequired;
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = p.invalidEmail;
        if (!form.currentPassword) errs.currentPassword = p.currentPwdRequired;
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setIsLoading(true);
        try {
            const result = await profileApi.updateProfile(form);
            setUser(result.user);
            setStatus('success');
            setMessage(p.profileUpdated);
            setForm(prev => ({ ...prev, currentPassword: '' }));
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.message || p.profileFailed);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form className="profile-form" onSubmit={handleSubmit}>
            <h3 className="profile-section-title">{p.editTitle}</h3>

            {status && (
                <div className={`profile-alert ${status}`}>{message}</div>
            )}

            <Input id="name" label={p.fullName} type="text" value={form.name}
                onChange={handleChange} error={errors.name} />

            <Input id="email" label={p.email} type="email" value={form.email}
                onChange={handleChange} error={errors.email} />

            <Input id="currentPassword" label={p.currentPwdConfirm} type="password"
                placeholder={p.currentPwdPlaceholder}
                value={form.currentPassword} onChange={handleChange} error={errors.currentPassword} />

            <Button type="submit" isLoading={isLoading} size="md">{p.saveChanges}</Button>
        </form>
    );
};

// ── Change Password Form ──────────────────────────────────
const ChangePasswordForm = () => {
    const { t } = useTranslation();
    const p = t.profile;
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState(null);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.id]: e.target.value }));
        setErrors(prev => ({ ...prev, [e.target.id]: '' }));
        setStatus(null);
    };

    const validate = () => {
        const errs = {};
        if (!form.currentPassword) errs.currentPassword = p.currentPwdRequired2;
        if (form.newPassword.length < 8) errs.newPassword = p.pwdMin;
        else if (!/[A-Z]/.test(form.newPassword)) errs.newPassword = p.pwdUpper;
        else if (!/\d/.test(form.newPassword)) errs.newPassword = p.pwdDigit;
        if (form.newPassword !== form.confirmPassword) errs.confirmPassword = p.pwdMismatch;
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setIsLoading(true);
        try {
            await profileApi.changePassword({
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
            });
            setStatus('success');
            setMessage(p.pwdChanged);
            setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.message || p.pwdFailed);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form className="profile-form" onSubmit={handleSubmit}>
            <h3 className="profile-section-title">{p.changePwdTitle}</h3>

            {status && (
                <div className={`profile-alert ${status}`}>{message}</div>
            )}

            <Input id="currentPassword" label={p.currentPwd} type="password"
                placeholder={p.currentPwdPlaceholder2}
                value={form.currentPassword} onChange={handleChange} error={errors.currentPassword} />

            <Input id="newPassword" label={p.newPwd} type="password"
                placeholder={p.newPwdPlaceholder}
                value={form.newPassword} onChange={handleChange} error={errors.newPassword} />

            <Input id="confirmPassword" label={p.confirmPwd} type="password"
                placeholder={p.confirmPwdPlaceholder}
                value={form.confirmPassword} onChange={handleChange} error={errors.confirmPassword} />

            <Button type="submit" isLoading={isLoading} size="md">{p.changePwdBtn}</Button>
        </form>
    );
};

// ── Profile Page ──────────────────────────────────────────
const ProfilePage = () => {
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const p = t.profile;
    const initial = user?.name?.[0]?.toUpperCase() || '?';
    const { avatarUrl, setAvatar, removeAvatar } = useAvatarStore();
    const fileInputRef = useRef(null);

    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            // Resize to max 256x256 to keep localStorage small
            const img = new Image();
            img.onload = () => {
                const size = 256;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                const min = Math.min(img.width, img.height);
                const sx = (img.width - min) / 2;
                const sy = (img.height - min) / 2;
                ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
                setAvatar(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    return (
        <div className="profile-page">
            {/* Avatar */}
            <div className="profile-header">
                <div className="profile-avatar-wrap">
                    <div className="profile-avatar" onClick={handleAvatarClick} title={p.changeAvatar}>
                        {avatarUrl
                            ? <img src={avatarUrl} alt="avatar" className="profile-avatar-img" />
                            : initial
                        }
                        <div className="avatar-overlay">📷</div>
                    </div>
                    {avatarUrl && (
                        <button className="avatar-remove-btn" onClick={removeAvatar} title={p.removeAvatar}>✕</button>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                </div>
                <div className="profile-info">
                    <h2 className="profile-name">{user?.name}</h2>
                    <p className="profile-email">{user?.email}</p>
                    <span className="avatar-hint">{p.changeAvatar}</span>
                </div>
            </div>

            <div className="profile-sections">
                {/* Language */}
                <div className="profile-card">
                    <h3 className="profile-section-title">{p.langTitle}</h3>
                    <p className="profile-section-desc">{p.langDesc}</p>
                    <LanguagePicker />
                </div>

                {/* Theme */}
                <div className="profile-card">
                    <h3 className="profile-section-title">{p.themeTitle}</h3>
                    <p className="profile-section-desc">{p.themeDesc}</p>
                    <ThemePicker />
                </div>

                {/* Edit Profile */}
                <div className="profile-card">
                    <EditProfileForm />
                </div>

                {/* Change Password */}
                <div className="profile-card">
                    <ChangePasswordForm />
                </div>

                {/* Notification Sound */}
                <div className="profile-card">
                    <SoundSettings />
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;

import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';

const RegisterForm = ({ onSwitchToLogin }) => {
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [errors, setErrors] = useState({});
    const { register, loginAsDemo, isLoading, error } = useAuthStore();
    const { t } = useTranslation();
    const a = t.auth;

    const validatePassword = (pwd) => {
        if (pwd.length < 8) return a.pwdMin;
        if (!/[A-Z]/.test(pwd)) return a.pwdUpper;
        if (!/\d/.test(pwd)) return a.pwdDigit;
        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)) return a.pwdSpecial;
        return null;
    };

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.id]: e.target.value }));
        if (errors[e.target.id]) setErrors(prev => ({ ...prev, [e.target.id]: '' }));
    };

    const validate = () => {
        const errs = {};
        if (!form.name.trim()) errs.name = a.nameRequired;
        if (!form.email.trim()) errs.email = a.emailRequired;
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = a.invalidEmail;
        const pwdErr = validatePassword(form.password);
        if (pwdErr) errs.password = pwdErr;
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        try {
            await register({ name: form.name, email: form.email, password: form.password });
        } catch {
            // error is in store
        }
    };

    return (
        <form onSubmit={handleSubmit} className="auth-form">
            <h2>{a.createAccount}</h2>
            {error && <div className="error-alert">{error}</div>}

            <Input
                id="name"
                label={a.fullName}
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                error={errors.name}
                required
            />

            <Input
                id="email"
                label={a.email}
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                error={errors.email}
                required
            />

            <Input
                id="password"
                label={a.password}
                type="password"
                placeholder={a.pwdPlaceholder}
                value={form.password}
                onChange={handleChange}
                error={errors.password}
                required
            />

            <Button type="submit" isLoading={isLoading} size="lg" className="w-full">
                {a.createAccount}
            </Button>

            <div className="demo-divider"><span>{a.or}</span></div>

            <Button
                type="button"
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={loginAsDemo}
            >
                {a.tryDemo}
            </Button>

            {onSwitchToLogin && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {a.alreadyHave}{' '}
                    <button
                        type="button"
                        onClick={onSwitchToLogin}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                    >
                        {a.signInLink}
                    </button>
                </p>
            )}
        </form>
    );
};

export default RegisterForm;

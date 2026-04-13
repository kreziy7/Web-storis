import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';

const LoginForm = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const { login, loginAsDemo, isLoading, error } = useAuthStore();
    const { t } = useTranslation();
    const a = t.auth;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(formData);
        } catch (err) {
            console.error('Login error:', err);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="auth-form">
            <h2>{a.login}</h2>
            {error && <div className="error-alert">{error}</div>}

            <Input
                id="email"
                label={a.email}
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
            />

            <Input
                id="password"
                label={a.password}
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
            />

            <Button type="submit" isLoading={isLoading} size="lg" className="w-full">
                {a.signIn}
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
        </form>
    );
};

export default LoginForm;

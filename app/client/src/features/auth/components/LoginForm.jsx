import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';

const LoginForm = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const { login, isLoading, error } = useAuthStore();

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
            <h2>Login</h2>
            {error && <div className="error-alert">{error}</div>}

            <Input
                id="email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
            />

            <Input
                id="password"
                label="Password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
            />

            <Button type="submit" isLoading={isLoading} size="lg" className="w-full">
                Sign In
            </Button>
        </form>
    );
};

export default LoginForm;

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from './features/auth/store/authStore';
import Button from './shared/components/Button';
import LoginForm from './features/auth/components/LoginForm';
import RegisterForm from './features/auth/components/RegisterForm';
import ReminderList from './features/reminders/components/ReminderList';
import ReminderForm from './features/reminders/components/ReminderForm';
import ProfilePage from './features/profile/components/ProfilePage';
import Analytics from './features/analytics/components/Analytics';
import AdminPage from './features/admin/components/AdminPage';
import ToastContainer from './shared/components/Toast';
import ReminderAlertContainer from './shared/components/ReminderAlert';
import NetworkStatus from './shared/components/NetworkStatus';
import { useNotifications } from './features/notifications/hooks/useNotifications';
import {
    ListTodo, BarChart3, LogOut,
    Zap, Terminal, ShieldCheck,
} from 'lucide-react';
import { useLanguageStore } from './store/languageStore';
import { useTranslation } from './shared/hooks/useTranslation';
import { useReminderStore } from './features/reminders/store/reminderStore';
import { useAvatarStore } from './store/avatarStore';
import SplashScreen, { shouldShowSplash, markSplashShown } from './shared/components/SplashScreen';
import './App.css';
import './features/auth/components/Auth.css';
import './store/themeStore';

// ── Bell SVG ───────────────────────────────────────────────
const BellSVG = ({ className }) => (
    <svg viewBox="0 0 448 512" className={className}>
        <path d="M224 0c-17.7 0-32 14.3-32 32V49.9C119.5 61.4 64 124.2 64 200v33.4c0 45.4-15.5 89.5-43.8 124.9L5.3 377c-5.8 7.2-6.9 17.1-2.9 25.4S14.8 416 24 416H424c9.2 0 17.6-5.3 21.6-13.6s2.9-18.2-2.9-25.4l-14.9-18.6C399.5 322.9 384 278.8 384 233.4V200c0-75.8-55.5-138.6-128-150.1V32c0-17.7-14.3-32-32-32zm0 96h8c57.4 0 104 46.6 104 104v33.4c0 47.9 13.9 94.6 39.7 134.6H72.3C98.1 328 112 281.3 112 233.4V200c0-57.4 46.6-104 104-104h8zm64 352H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7s18.7-28.3 18.7-45.3z" />
    </svg>
);

// ── Language Switcher ──────────────────────────────────────
const LanguageSwitcher = () => {
    const { lang, langs, setLang } = useLanguageStore();
    return (
        <div className="lang-switcher">
            {langs.map(l => (
                <button
                    key={l.code}
                    className={`lang-switch-btn ${lang === l.code ? 'lang-switch-active' : ''}`}
                    onClick={() => setLang(l.code)}
                    title={l.label}
                >
                    {l.label}
                </button>
            ))}
        </div>
    );
};

// ── Notification Bell (just mounts the hook) ──────────────
const NotificationBell = () => {
    useNotifications();
    return null;
};

// ── Auth Page ──────────────────────────────────────────────
const AuthPage = () => {
    const [mode, setMode] = useState('login');
    const { t } = useTranslation();
    const a = t.auth;
    return (
        <div className="auth-page">
            <AnimatePresence mode="wait">
                {mode === 'login' ? (
                    <motion.div
                        key="login"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
                    >
                        <LoginForm />
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                            {a.noAccount}{' '}
                            <button
                                type="button"
                                onClick={() => setMode('register')}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', fontSize: 'inherit' }}
                            >
                                {a.createOne}
                            </button>
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="register"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        style={{ width: '100%' }}
                    >
                        <RegisterForm onSwitchToLogin={() => setMode('login')} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Private Route ──────────────────────────────────────────
const PrivateRoute = ({ children }) => {
    const { isAuthenticated, isInitializing } = useAuthStore();
    if (isInitializing) return null;
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// ── App ────────────────────────────────────────────────────
const App = () => {
    const { isAuthenticated, isInitializing, user, logout, isDemo } = useAuthStore();
    const isAdmin = user?.role === 'admin';
    const { t } = useTranslation();
    const { avatarUrl } = useAvatarStore();

    const [showSplash, setShowSplash] = React.useState(false);
    const [splashReady, setSplashReady] = React.useState(false);

    const autoCleanup = useReminderStore(s => s.autoCleanup);

    React.useEffect(() => {
        useAuthStore.getState().initialize();
    }, []);

    // Run auto-cleanup every 60 seconds while authenticated
    React.useEffect(() => {
        if (!isAuthenticated) return;
        const interval = setInterval(() => {
            autoCleanup();
        }, 60 * 1000);
        return () => clearInterval(interval);
    }, [isAuthenticated, autoCleanup]);

    React.useEffect(() => {
        if (!isInitializing) {
            if (isAuthenticated && !isDemo && user?.id && shouldShowSplash(user.id)) {
                setShowSplash(true);
            }
            setSplashReady(true);
        }
    }, [isInitializing, isAuthenticated, isDemo, user?.id]);

    if (isInitializing || !splashReady) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '100vh', background: 'var(--bg-main)', flexDirection: 'column', gap: 16,
            }}>
                <div style={{
                    width: 36, height: 36,
                    border: '2px solid rgba(148,137,121,0.2)',
                    borderTopColor: 'rgba(223,208,184,0.6)',
                    borderRadius: '50%',
                    animation: 'global-spin 0.7s linear infinite',
                }} />
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    initializing...
                </span>
            </div>
        );
    }

    if (showSplash) {
        return (
            <SplashScreen
                userId={user?.id}
                onDone={() => setShowSplash(false)}
            />
        );
    }

    return (
        <Router>
            <div className="app-container">
                <header className="app-header">
                    <div className="header-content">
                        {/* Logo */}
                        <Link to="/" className="header-logo">
                            <span className="header-logo-icon">
                                <Terminal size={14} strokeWidth={1.8} />
                            </span>
                            Smart Reminder
                        </Link>

                        {/* Main nav */}
                        {isAuthenticated && (
                            <nav className="header-nav">
                                <NavLink
                                    to="/"
                                    end
                                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                >
                                    <ListTodo size={14} strokeWidth={1.8} />
                                    <span>{t.nav.reminders}</span>
                                </NavLink>
                                <NavLink
                                    to="/analytics"
                                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                >
                                    <BarChart3 size={14} strokeWidth={1.8} />
                                    <span>{t.nav.analytics}</span>
                                </NavLink>
                                {isAdmin && (
                                    <NavLink
                                        to="/admin"
                                        className={({ isActive }) => `nav-link nav-link-admin ${isActive ? 'active' : ''}`}
                                    >
                                        <ShieldCheck size={14} strokeWidth={1.8} />
                                        <span>{t.nav.admin}</span>
                                    </NavLink>
                                )}
                            </nav>
                        )}

                        {/* User controls */}
                        {isAuthenticated ? (
                            <div className="user-nav">
                                <NotificationBell />
                                <LanguageSwitcher />
                                <div className="header-sep" />
                                <NavLink
                                    to="/profile"
                                    className={({ isActive }) => `user-name-link ${isActive ? 'active' : ''}`}
                                >
                                    <span className="user-avatar-small">
                                        {avatarUrl
                                            ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                            : user?.name?.[0]?.toUpperCase()
                                        }
                                    </span>
                                    <span className="user-name">{user?.name}</span>
                                </NavLink>
                                <motion.div whileTap={{ scale: 0.92 }}>
                                    <Button variant="outline" size="sm" onClick={logout}>
                                        <LogOut size={13} strokeWidth={2} />
                                    </Button>
                                </motion.div>
                            </div>
                        ) : (
                            <div className="user-nav">
                                <LanguageSwitcher />
                            </div>
                        )}
                    </div>
                </header>

                <NetworkStatus />

                <AnimatePresence>
                    {isDemo && (
                        <motion.div
                            className="demo-banner"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                        >
                            <Zap size={12} style={{ display: 'inline', marginRight: 5 }} />
                            {t.demo.banner}{' '}
                            <button type="button" onClick={logout} className="demo-banner-exit">
                                {t.demo.exit}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <main className="app-main">
                    <Routes>
                        <Route path="/login" element={
                            isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />
                        } />

                        <Route path="/" element={
                            <PrivateRoute><ReminderList /></PrivateRoute>
                        } />

                        <Route path="/analytics" element={
                            <PrivateRoute><Analytics /></PrivateRoute>
                        } />

                        <Route path="/profile" element={
                            <PrivateRoute><ProfilePage /></PrivateRoute>
                        } />

                        <Route path="/admin" element={
                            <PrivateRoute>
                                {isAdmin ? <AdminPage /> : <Navigate to="/" replace />}
                            </PrivateRoute>
                        } />

                        <Route path="/reminders/new" element={
                            <PrivateRoute><ReminderForm /></PrivateRoute>
                        } />

                        <Route path="/reminders/:id/edit" element={
                            <PrivateRoute><ReminderForm /></PrivateRoute>
                        } />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>

                <footer className="app-footer">
                    ~ smart-reminder-pwa · offline-first · {new Date().getFullYear()}
                </footer>

                <ToastContainer />
                <ReminderAlertContainer />
            </div>
        </Router>
    );
};

export default App;

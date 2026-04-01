import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './features/auth/store/authStore';
import Button from './shared/components/Button';
import LoginForm from './features/auth/components/LoginForm';
import './App.css';
import './features/auth/components/Auth.css';

const App = () => {
    const { isAuthenticated, user, logout } = useAuthStore();

    return (
        <Router>
            <div className="app-container">
                <header className="app-header">
                    <div className="header-content">
                        <h1>Smart Reminder</h1>
                        {isAuthenticated && (
                            <div className="user-nav">
                                <span>{user?.name}</span>
                                <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
                            </div>
                        )}
                    </div>
                </header>

                <main className="app-main">
                    <Routes>
                        <Route path="/" element={
                            isAuthenticated ? (
                                <div className="dashboard">
                                    <h2>Welcome back, {user?.name}!</h2>
                                    <p>Your reminders will appear here soon.</p>
                                </div>
                            ) : (
                                <Navigate to="/login" />
                            )
                        } />
                        <Route path="/login" element={
                            isAuthenticated ? <Navigate to="/" /> : (
                                <div className="auth-page">
                                    <LoginForm />
                                </div>
                            )
                        } />
                    </Routes>
                </main>

                <footer className="app-footer">
                    <p>&copy; 2024 Smart Reminder PWA. Offline-first & Secure.</p>
                </footer>
            </div>
        </Router>
    );
};

export default App;

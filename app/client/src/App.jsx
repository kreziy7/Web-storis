import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './features/auth/store/authStore';
import { syncEngine } from './sync/syncEngine';
import LoginForm from './features/auth/components/LoginForm';
import StoryList from './features/stories/components/StoryList';
import StoryUpload from './features/stories/components/StoryUpload';
import { useSyncStore } from './store/syncStore';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';

const App = () => {
    const { isAuthenticated, user, logout } = useAuthStore();
    const { isSyncing, pendingCount } = useSyncStore();

    useEffect(() => {
        syncEngine.init();
    }, []);

    return (
        <Router>
            <div className="min-h-screen bg-bg-main text-text-main flex flex-col">
                {/* Navbar */}
                <header className="sticky top-0 z-50 glass-card rounded-none border-t-0 border-x-0 bg-bg-main/80">
                    <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-tr from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                                <span className="text-white font-black text-xl italic">W</span>
                            </div>
                            <h1 className="text-2xl font-black bg-gradient-to-r from-text-main to-text-muted bg-clip-text text-transparent tracking-tight">
                                WebStoris
                            </h1>
                        </div>

                        <div className="flex items-center gap-6">
                            {/* Sync Status */}
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium">
                                {isSyncing ? (
                                    <>
                                        <Loader2 className="w-3.4 h-3.4 animate-spin text-primary" />
                                        <span className="text-primary">Syncing...</span>
                                    </>
                                ) : pendingCount > 0 ? (
                                    <>
                                        <CloudOff className="w-3.4 h-3.4 text-accent" />
                                        <span className="text-accent">{pendingCount} pending</span>
                                    </>
                                ) : (
                                    <>
                                        <Cloud className="w-3.4 h-3.4 text-success" />
                                        <span className="text-success">Synced</span>
                                    </>
                                )}
                            </div>

                            {isAuthenticated ? (
                                <div className="flex items-center gap-4">
                                    <div className="hidden sm:block text-right">
                                        <p className="text-sm font-bold truncate max-w-[120px]">{user?.name}</p>
                                        <p className="text-[10px] text-text-muted uppercase tracking-widest">Premium User</p>
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold transition-all"
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
                    <Routes>
                        <Route path="/" element={
                            isAuthenticated ? (
                                <div className="space-y-12">
                                    <StoryUpload />
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-3xl font-black tracking-tight">Latest Stories</h2>
                                            <div className="h-px flex-1 mx-6 bg-gradient-to-r from-border to-transparent" />
                                        </div>
                                        <StoryList />
                                    </div>
                                </div>
                            ) : (
                                <Navigate to="/login" />
                            )
                        } />
                        <Route path="/login" element={
                            isAuthenticated ? <Navigate to="/" /> : (
                                <div className="min-h-[70vh] flex items-center justify-center">
                                    <LoginForm />
                                </div>
                            )
                        } />
                    </Routes>
                </main>

                {/* Footer */}
                <footer className="py-10 border-t border-border/30 text-center opacity-50 text-sm">
                    <p>&copy; 2026 WebStoris PWA. Built with ❤️ for the future.</p>
                </footer>
            </div>
        </Router>
    );
};

export default App;

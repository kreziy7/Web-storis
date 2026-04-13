import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { syncEngine } from './sync/syncEngine.js';
import { registerSW } from 'virtual:pwa-register';
import './index.css';

// Initialize sync engine
syncEngine.init().catch(console.error);

// Register Service Worker (handles background push + offline cache)
registerSW({
    onNeedRefresh() {
        // New SW available — silently update (autoUpdate mode)
    },
    onOfflineReady() {
        console.log('[SW] App is ready to work offline');
    },
    onRegistered(swReg) {
        if (swReg) {
            console.log('[SW] Service Worker registered');
        }
    },
    onRegisterError(error) {
        console.error('[SW] Registration failed:', error);
    },
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

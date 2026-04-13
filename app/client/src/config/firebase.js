import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
    apiKey:            'AIzaSyBvl1FXO1gzm1-6vB7_3K2rkXAm02kAcso',
    authDomain:        'smart-reminder-67da6.firebaseapp.com',
    projectId:         'smart-reminder-67da6',
    storageBucket:     'smart-reminder-67da6.firebasestorage.app',
    messagingSenderId: '100592909854',
    appId:             '1:100592909854:web:97bc25e4867dd6526ab80f',
};

const FCM_VAPID_KEY = 'BFgi13pXgQFJXv-htLcQweg5qnpcR_QbHdX4ruUwBiUl8dPrzgbSBPCGz1BCuxC75ZorRMJKox7laEaA1WklVaA';

const firebaseApp = initializeApp(firebaseConfig);
const messaging   = getMessaging(firebaseApp);

/**
 * Get FCM token for this browser/device.
 * Requires notification permission to be granted.
 * Uses our custom SW (sw.js) instead of firebase-messaging-sw.js
 */
export async function getFCMToken() {
    if (!('serviceWorker' in navigator)) return null;
    try {
        const reg = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, {
            vapidKey: FCM_VAPID_KEY,
            serviceWorkerRegistration: reg,
        });
        return token || null;
    } catch (err) {
        console.warn('[FCM] getToken failed:', err.message);
        return null;
    }
}

import api from '../../../api/axios.js';
import { getFCMToken } from '../../../config/firebase.js';

let _cachedToken = null;

/**
 * Get FCM token (cached after first call)
 */
export async function requestFCMToken() {
    if (_cachedToken) return _cachedToken;
    const token = await getFCMToken();
    if (token) _cachedToken = token;
    return token;
}

/**
 * Send reminder schedule to backend so FCM can push even when tab is closed.
 * reminders = array of { clientId, title, description, priority, dueDate }
 */
export async function syncFCMSchedule(reminders) {
    const fcmToken = await requestFCMToken();
    if (!fcmToken) return;

    await api.post('/push/sync-schedule', {
        fcmToken,
        reminders: reminders.map(r => ({
            clientId:    r.clientId || r.id,
            title:       r.title,
            description: r.description || '',
            priority:    r.priority || 'medium',
            dueDate:     r.dueDate,
        })),
    });
}

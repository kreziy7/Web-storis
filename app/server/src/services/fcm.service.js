import admin from 'firebase-admin';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

// Load service account JSON
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccount = require(path.resolve(__dirname, '../../smart-reminder-67da6-firebase-adminsdk-fbsvc-f7863ba64c.json'));

// Initialize Firebase Admin once
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const messaging = admin.messaging();

/**
 * Send push notification to a single FCM token
 */
export async function sendToToken(fcmToken, { title, body, data = {} }) {
    try {
        await messaging.send({
            token: fcmToken,
            webpush: {
                notification: {
                    title,
                    body,
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    requireInteraction: false,
                },
                fcmOptions: { link: '/' },
            },
            data: { ...data, title, body },
        });
        return true;
    } catch (err) {
        // Token invalid or unregistered → remove it
        if (
            err.code === 'messaging/invalid-registration-token' ||
            err.code === 'messaging/registration-token-not-registered'
        ) {
            return 'invalid';
        }
        console.error('[FCM] Send error:', err.message);
        return false;
    }
}

/**
 * Send to multiple tokens, remove invalid ones
 */
export async function sendToTokens(fcmTokens, payload) {
    const results = await Promise.all(
        fcmTokens.map(t => sendToToken(t, payload))
    );
    return results;
}

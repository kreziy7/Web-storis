import admin from 'firebase-admin';

// Initialize Firebase Admin using environment variable
if (!admin.apps.length) {
    const firebaseEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (firebaseEnv) {
        const serviceAccount = JSON.parse(firebaseEnv);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } else {
        console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT env not set — FCM disabled');
    }
}

const messaging = admin.apps.length ? admin.messaging() : null;

/**
 * Send push notification to a single FCM token
 */
export async function sendToToken(fcmToken, { title, body, data = {} }) {
    if (!messaging) return false;
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

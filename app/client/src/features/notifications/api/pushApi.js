import api from '../../../api/axios.js';

// Fetch VAPID public key from server
export async function getVapidPublicKey() {
    const res = await api.get('/push/vapid-public-key');
    return res.data.publicKey;
}

// Convert base64 string to Uint8Array (required by pushManager.subscribe)
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// Subscribe this device to push notifications
export async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

    const reg = await navigator.serviceWorker.ready;
    const publicKey = await getVapidPublicKey();

    // Check if already subscribed
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
        subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
    }

    // Send subscription to backend
    const { endpoint, keys } = subscription.toJSON();
    await api.post('/push/subscribe', { endpoint, keys });

    return subscription;
}

// Unsubscribe this device
export async function unsubscribeFromPush() {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return;

    await subscription.unsubscribe();
    await api.delete('/push/unsubscribe', {
        data: { endpoint: subscription.endpoint },
    });
}

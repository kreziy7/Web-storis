import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.model.js';

// Configure VAPID once at startup
webpush.setVapidDetails(
    `mailto:${process.env.VAPID_MAILTO}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// Save or update subscription for a user
export async function saveSubscription(userId, subscriptionData) {
    const { endpoint, keys } = subscriptionData;
    return PushSubscription.findOneAndUpdate(
        { endpoint },
        { userId, endpoint, keys },
        { upsert: true, new: true }
    );
}

// Remove subscription
export async function deleteSubscription(endpoint) {
    return PushSubscription.deleteOne({ endpoint });
}

// Send push to a single subscription object
export async function sendPush(subscription, payload) {
    try {
        await webpush.sendNotification(
            { endpoint: subscription.endpoint, keys: subscription.keys },
            JSON.stringify(payload)
        );
        return true;
    } catch (err) {
        // 410 Gone = subscription expired, remove it
        if (err.statusCode === 410) {
            await PushSubscription.deleteOne({ endpoint: subscription.endpoint });
        }
        return false;
    }
}

// Send push notification to all devices of a user
export async function notifyUser(userId, payload) {
    const subs = await PushSubscription.find({ userId });
    await Promise.all(subs.map(sub => sendPush(sub, payload)));
}

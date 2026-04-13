import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ScheduledPush from '../models/ScheduledPush.model.js';

// GET /api/v1/push/vapid-public-key  (legacy, keep for compatibility)
export const getVapidPublicKey = asyncHandler(async (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

// POST /api/v1/push/sync-schedule
// Frontend sends: { fcmToken, reminders: [{ clientId, title, body, priority, dueDate }] }
// Backend replaces all scheduled pushes for this user
export const syncSchedule = asyncHandler(async (req, res) => {
    const { fcmToken, reminders } = req.body;

    if (!fcmToken) throw new ApiError(400, 'fcmToken required');
    if (!Array.isArray(reminders)) throw new ApiError(400, 'reminders must be array');

    const userId = req.user._id;

    // Delete old unsent schedules for this user
    await ScheduledPush.deleteMany({ userId, sent: false });

    // Insert new ones
    const now = new Date();
    const docs = reminders
        .filter(r => r.dueDate && new Date(r.dueDate) > now)
        .map(r => ({
            userId,
            fcmToken,
            reminderClientId: r.clientId,
            title: r.title || 'Reminder',
            body: r.description || '',
            priority: r.priority || 'medium',
            dueDate: new Date(r.dueDate),
            sent: false,
        }));

    if (docs.length > 0) {
        await ScheduledPush.insertMany(docs);
    }

    res.json({ success: true, scheduled: docs.length });
});

// POST /api/v1/push/test
export const testPush = asyncHandler(async (req, res) => {
    const { fcmToken } = req.body;
    if (!fcmToken) throw new ApiError(400, 'fcmToken required');

    const { sendToToken } = await import('../services/fcm.service.js');
    await sendToToken(fcmToken, {
        title: '✅ Test Notification',
        body: 'Push notifications are working!',
    });

    res.json({ success: true });
});

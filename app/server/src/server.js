import 'dotenv/config';
import http from 'http';
import cron from 'node-cron';
import app from './app.js';
import connectToDatabase from './config/db.js';
import logger from './utils/logger.js';
import { validateEnv } from './config/env.js';
import User from './models/User.model.js';
import ScheduledPush from './models/ScheduledPush.model.js';
import { sendToToken } from './services/fcm.service.js';

const seedAdmin = async () => {
    const ADMIN_EMAIL = 'admin@log';
    const ADMIN_PASSWORD = 'administrator';
    const ADMIN_NAME = 'Admin';

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (!existing) {
        await User.create({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: ADMIN_NAME, role: 'admin' });
        logger.info('Admin account created: admin@log');
    } else if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        logger.info('Admin role restored for admin@log');
    }
};

const startServer = async () => {
    try {
        // Validate environment variables
        validateEnv();

        const PORT = process.env.PORT || 5000;
        const server = http.createServer(app);

        // Database Connection
        await connectToDatabase();

        // Seed admin account
        await seedAdmin();

        server.listen(PORT, () => {
            logger.info(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });

        // ── FCM Scheduler: every minute check due reminders ──
        cron.schedule('* * * * *', async () => {
            try {
                const now = new Date();
                const windowEnd = new Date(now.getTime() + 60 * 1000); // next 60s

                const due = await ScheduledPush.find({
                    sent: false,
                    dueDate: { $gte: now, $lte: windowEnd },
                });

                for (const item of due) {
                    const result = await sendToToken(item.fcmToken, {
                        title: `⏰ ${item.title}`,
                        body: item.body || 'Your reminder is due!',
                    });

                    if (result === 'invalid') {
                        await ScheduledPush.deleteMany({ fcmToken: item.fcmToken });
                    } else {
                        item.sent = true;
                        await item.save();
                    }
                }

                if (due.length > 0) {
                    logger.info(`[FCM] Sent ${due.length} reminder notification(s)`);
                }
            } catch (err) {
                logger.error('[FCM Scheduler] Error:', err.message);
            }
        });
    } catch (error) {
        logger.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();

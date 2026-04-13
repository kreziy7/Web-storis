import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { getVapidPublicKey, syncSchedule, testPush } from '../controllers/push.controller.js';

const router = Router();

router.get('/vapid-public-key', getVapidPublicKey);
router.post('/sync-schedule', protect, syncSchedule);
router.post('/test',          protect, testPush);

export default router;

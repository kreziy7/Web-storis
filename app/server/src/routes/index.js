import { Router } from 'express';
import authRoutes from './auth.routes.js';
import storyRoutes from './story.routes.js';
import profileRoutes from './profile.routes.js';
import adminRoutes from './admin.routes.js';
import pushRoutes from './push.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/stories', storyRoutes);
router.use('/profile', profileRoutes);
router.use('/admin', adminRoutes);
router.use('/push', pushRoutes);


router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import storyRoutes from './story.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/stories', storyRoutes);


router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;

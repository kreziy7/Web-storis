import { Router } from 'express';
import { updateProfile, changePassword } from '../controllers/profile.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.put('/', updateProfile);
router.put('/password', changePassword);

export default router;

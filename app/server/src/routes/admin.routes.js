import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import {
    getStats,
    getUsers,
    getUser,
    toggleBan,
    toggleRole,
    deleteUser,
} from '../controllers/admin.controller.js';

const router = Router();

router.use(protect, requireAdmin);

router.get('/stats',           getStats);
router.get('/users',           getUsers);
router.get('/users/:id',       getUser);
router.patch('/users/:id/ban', toggleBan);
router.patch('/users/:id/role',toggleRole);
router.delete('/users/:id',    deleteUser);

export default router;

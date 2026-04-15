import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { getAll, create, update, remove, sync } from '../controllers/reminders.controller.js';

const router = Router();

router.use(protect);

router.get('/', getAll);
router.post('/', create);
router.post('/sync', sync);
router.put('/:clientId', update);
router.delete('/:clientId', remove);

export default router;

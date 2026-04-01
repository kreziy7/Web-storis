import { Router } from 'express';
import {
    createStory,
    getActiveStories,
    getMyStories,
    viewStory,
    deleteStory
} from '../controllers/story.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Publicly accessible stories (active ones)
router.get('/', getActiveStories);

// Private/Protected routes
router.use(protect); // All routes below are protected

router.post('/', createStory);
router.get('/my', getMyStories);
router.patch('/view/:id', viewStory);
router.delete('/:id', deleteStory);

export default router;

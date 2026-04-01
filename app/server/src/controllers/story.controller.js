import Story from '../models/Story.model.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @desc Create a new story
 * @route POST /api/stories
 */
export const createStory = asyncHandler(async (req, res) => {
    const { title, mediaUrl, mediaType } = req.body;

    // Check if user is authenticated (via auth middleware)
    if (!req.user) {
        throw new ApiError(401, 'Please authenticate first');
    }

    const story = await Story.create({
        userId: req.user.id,
        title,
        mediaUrl,
        mediaType: mediaType || 'image'
    });

    res.status(201).json({ success: true, story });
});

/**
 * @desc Get all active stories
 * @route GET /api/stories
 */
export const getActiveStories = asyncHandler(async (req, res) => {
    const activeStories = await Story.find({
        isActive: true,
        expiresAt: { $gt: new Date() }
    })
        .populate('userId', 'name email')
        .sort('-createdAt');

    res.json({ success: true, stories: activeStories });
});

/**
 * @desc Get user's own stories
 * @route GET /api/stories/my
 */
export const getMyStories = asyncHandler(async (req, res) => {
    const myStories = await Story.find({ userId: req.user.id })
        .sort('-createdAt');

    res.json({ success: true, stories: myStories });
});

/**
 * @desc View a story increment (Optional logic)
 * @route PATCH /api/stories/view/:id
 */
export const viewStory = asyncHandler(async (req, res) => {
    const story = await Story.findById(req.params.id);

    if (!story) {
        throw new ApiError(404, 'Story not found');
    }

    // Only add if user not already in views
    if (!story.views.includes(req.user.id)) {
        story.views.push(req.user.id);
        await story.save();
    }

    res.json({ success: true, views: story.views.length });
});

/**
 * @desc Delete a story
 * @route DELETE /api/stories/:id
 */
export const deleteStory = asyncHandler(async (req, res) => {
    const story = await Story.findById(req.params.id);

    if (!story) {
        throw new ApiError(404, 'Story not found');
    }

    // Check ownership
    if (story.userId.toString() !== req.user.id) {
        throw new ApiError(403, 'Unauthorized to delete this story');
    }

    await story.deleteOne();
    res.json({ success: true, message: 'Story deleted successfully' });
});

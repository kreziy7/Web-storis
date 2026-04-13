import User from '../models/User.model.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// PUT /api/profile
export const updateProfile = asyncHandler(async (req, res) => {
    const { name, email, currentPassword } = req.body;

    if (!name && !email) {
        throw new ApiError(400, 'Provide at least name or email to update');
    }

    // Load user with password for verification
    const user = await User.findById(req.user._id);

    // Require current password to confirm identity
    if (!currentPassword) {
        throw new ApiError(400, 'Current password is required to update profile');
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        throw new ApiError(401, 'Current password is incorrect');
    }

    // Check email uniqueness if changing
    if (email && email !== user.email) {
        const existing = await User.findOne({ email });
        if (existing) {
            throw new ApiError(400, 'Email is already taken');
        }
        user.email = email;
    }

    if (name) user.name = name;

    await user.save();

    res.json({ user: { id: user._id, email: user.email, name: user.name } });
});

// PUT /api/profile/password
export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new ApiError(400, 'currentPassword and newPassword are required');
    }

    if (newPassword.length < 8) {
        throw new ApiError(400, 'New password must be at least 8 characters');
    }

    const user = await User.findById(req.user._id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        throw new ApiError(401, 'Current password is incorrect');
    }

    user.password = newPassword;
    await user.save(); // pre-save hook hashes it

    res.json({ success: true, message: 'Password changed successfully' });
});

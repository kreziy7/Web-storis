import User from '../models/User.model.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// ── Stats ──────────────────────────────────────────────────
export const getStats = asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, banned, admins, todayNew] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isBanned: true }),
        User.countDocuments({ role: 'admin' }),
        User.countDocuments({ createdAt: { $gte: today } }),
    ]);

    res.json({ total, banned, admins, todayNew, active: total - banned });
});

// ── Users list ─────────────────────────────────────────────
export const getUsers = asyncHandler(async (req, res) => {
    const { search = '', page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = search
        ? { $or: [
            { name:  { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ] }
        : {};

    const [users, total] = await Promise.all([
        User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        User.countDocuments(query),
    ]);

    res.json({ users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

// ── Single user ────────────────────────────────────────────
export const getUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) throw new ApiError(404, 'User not found');
    res.json({ user });
});

// ── Ban / Unban ────────────────────────────────────────────
export const toggleBan = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    if (user.role === 'admin') throw new ApiError(400, 'Cannot ban another admin');

    user.isBanned = !user.isBanned;
    await user.save();

    res.json({ isBanned: user.isBanned });
});

// ── Promote / Demote ───────────────────────────────────────
export const toggleRole = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    if (String(user._id) === String(req.user._id)) throw new ApiError(400, 'Cannot change your own role');

    user.role = user.role === 'admin' ? 'user' : 'admin';
    await user.save();

    res.json({ role: user.role });
});

// ── Delete user ────────────────────────────────────────────
export const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    if (user.role === 'admin') throw new ApiError(400, 'Cannot delete an admin account');

    await user.deleteOne();
    res.json({ success: true });
});

import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/User.model.js';

/**
 * @desc Protect routes - check if user is authenticated via Bearer token
 */
export const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.accessToken) {
        token = req.cookies.accessToken; // fallback to cookie
    }

    if (!token) {
        throw new ApiError(401, 'Please authenticate first');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            throw new ApiError(401, 'User associated with this token no longer exists');
        }

        next();
    } catch (error) {
        throw new ApiError(401, 'Invalid token, please log in again');
    }
});

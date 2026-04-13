import ApiError from '../utils/ApiError.js';

/**
 * Require admin role — must be used AFTER protect middleware
 */
export const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        throw new ApiError(403, 'Access denied: admins only');
    }
    next();
};

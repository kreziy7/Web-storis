import { z } from 'zod';
import logger from '../utils/logger.js';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('5000'),
    MONGODB_URI: z.string(),
    JWT_ACCESS_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),
    CLIENT_URL: z.string().url().default('http://localhost:5173'),
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_MAILTO: z.string().email().optional(),
});

export const validateEnv = () => {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        logger.error('Invalid environment variables:', parsed.error.format());
        throw new Error('Invalid environment variables');
    }

    return parsed.data;
};

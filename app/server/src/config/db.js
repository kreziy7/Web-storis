import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectToDatabase = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }
        await mongoose.connect(mongoUri);
        logger.info('Connected to MongoDB successfully');
    } catch (error) {
        logger.error('Failed to connect to MongoDB:', error.message);
        throw error;
    }
};

export default connectToDatabase;

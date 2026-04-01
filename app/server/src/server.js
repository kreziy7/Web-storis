import 'dotenv/config';
import http from 'http';
import app from './app.js';
import connectToDatabase from './config/db.js';
import logger from './utils/logger.js';
import { validateEnv } from './config/env.js';

const startServer = async () => {
    try {
        // Validate environment variables
        validateEnv();

        const PORT = process.env.PORT || 5000;
        const server = http.createServer(app);

        // Database Connection
        await connectToDatabase();

        server.listen(PORT, () => {
            logger.info(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();

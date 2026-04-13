export const APP_NAME = 'Smart Reminder';
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const PRIORITY = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
};

export const SYNC_STATUS = {
    IDLE: 'idle',
    SYNCING: 'syncing',
    ERROR: 'error',
};

export const DB_NAME = 'smart_reminder_db';
export const DB_VERSION = 1;

export const TOKEN_KEY = 'sr_access_token';
export const USER_KEY = 'sr_user';

# ЭТАП 10 — PRODUCTION QUALITY

## Логирование (Winston)

### logger.ts

```typescript
// server/src/utils/logger.ts

import winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const isDev = process.env.NODE_ENV === 'development';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',

  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),

  transports: [
    // Консоль (colorized в dev)
    new winston.transports.Console({
      format: isDev ? combine(colorize(), simple()) : json(),
    }),

    // Файл ошибок
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024,  // 10MB
      maxFiles: 5,
    }),

    // Все логи
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
});

// Логирование unhandled rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
```

### HTTP Request Logger Middleware

```typescript
// server/src/middleware/requestLogger.ts

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: (req as any).user?.id,
    });
  });

  next();
}
```

---

## Security

### JWT Service

```typescript
// server/src/services/auth.service.ts

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.model';
import { ApiError } from '../utils/ApiError';

const SALT_ROUNDS = 12;

export class AuthService {

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateAccessToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'access' },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
    );
  }

  generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
    );
  }

  verifyAccessToken(token: string): { userId: string } {
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;
      if (payload.type !== 'access') throw new Error('Invalid token type');
      return { userId: payload.userId };
    } catch {
      throw ApiError.unauthorized('Invalid or expired access token');
    }
  }

  verifyRefreshToken(token: string): { userId: string } {
    try {
      const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as any;
      if (payload.type !== 'refresh') throw new Error('Invalid token type');
      return { userId: payload.userId };
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }
  }

  async register(email: string, password: string, name: string) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw ApiError.conflict('Email already registered');

    const passwordHash = await this.hashPassword(password);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name,
    });

    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
    };
  }

  async login(email: string, password: string) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

    // Единое сообщение: no user enumeration
    if (!user || !(await this.verifyPassword(password, user.passwordHash))) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
    };
  }
}

export const authService = new AuthService();
```

---

## Error Handling

### ApiError.ts

```typescript
// server/src/utils/ApiError.ts

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthorized(message: string) {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message: string) {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message: string) {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string) {
    return new ApiError(409, 'CONFLICT', message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, 'SERVER_ERROR', message);
  }
}
```

### errorHandler.ts — Global Error Middleware

```typescript
// server/src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.message,
      },
    });
    return;
  }

  // Неизвестные ошибки
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: 'Internal server error',
    },
  });
}
```

---

## Validation

### reminder.validators.ts

```typescript
// server/src/validators/reminder.validators.ts

import { body, param, query } from 'express-validator';

export const createReminderValidator = [
  body('clientId')
    .isUUID(4)
    .withMessage('clientId must be a valid UUID v4'),

  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),

  body('dueDate')
    .isISO8601()
    .withMessage('dueDate must be a valid ISO 8601 date')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('dueDate cannot be in the past');
      }
      return true;
    }),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('priority must be low, medium, or high'),

  body('tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('tags must be an array with at most 20 items'),
];

export const updateReminderValidator = [
  param('id')
    .notEmpty()
    .withMessage('id is required'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 }),

  body('version')
    .optional()
    .isInt({ min: 1 })
    .withMessage('version must be a positive integer'),
];
```

### validate.ts — Middleware

```typescript
// server/src/middleware/validate.ts

import { validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ApiError.badRequest('Validation failed', errors.array());
  }
  next();
}
```

---

## Rate Limiting

```typescript
// server/src/middleware/rateLimiter.ts

import rateLimit from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 минута
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many requests, please try again later' },
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many auth attempts' },
  },
});

export const syncLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Sync rate limit exceeded' },
  },
});
```

---

## Debounce (Frontend)

```typescript
// client/src/shared/hooks/useDebounce.ts

import { useCallback, useRef } from 'react';

export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timer = useRef<ReturnType<typeof setTimeout>>();

  return useCallback(
    (...args: Parameters<T>) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        fn(...args);
      }, delay);
    },
    [fn, delay]
  );
}
```

---

## app.ts — Express Application Setup

```typescript
// server/src/app.ts

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { globalLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
app.use(requestLogger);

// Rate limiting
app.use('/api/', globalLimiter);

// Routes
app.use('/api/v1', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (last!)
app.use(errorHandler);

export default app;
```

---

## MongoDB Models (полные)

### Reminder.model.ts

```typescript
// server/src/models/Reminder.model.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IReminder extends Document {
  clientId: string;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  dueDate: Date;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  version: number;
  isSynced: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  notified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReminderSchema = new Schema<IReminder>(
  {
    clientId: { type: String, required: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    dueDate: { type: Date, required: true, index: true },
    isCompleted: { type: Boolean, default: false },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    tags: [{ type: String, trim: true }],
    version: { type: Number, default: 1 },
    isSynced: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    notified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index: clientId + userId
ReminderSchema.index({ clientId: 1, userId: 1 }, { unique: true });

// Partial index для активных записей
ReminderSchema.index(
  { userId: 1, dueDate: 1 },
  { partialFilterExpression: { isDeleted: false } }
);

export const Reminder = mongoose.model<IReminder>('Reminder', ReminderSchema);
```

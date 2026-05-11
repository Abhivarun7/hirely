import express, { Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import pino from 'pino';
import mongoSanitize from 'mongo-sanitize';
import path from 'path';
import config from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import authRoutes from './modules/auth/auth.routes.js';
import publicRoutes from './modules/public/public.routes.js';
import seekerRoutes from './modules/seeker/seeker.routes.js';
import companyRoutes from './modules/company/company.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import officialRoutes from './modules/official/official.routes.js';
import supportRoutes from './modules/support/support.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import trackingRoutes from './modules/tracking/tracking.routes.js';

const logger = pino({ name: 'app' });

export function createApp(): Express {
  const app = express();

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet());

  // CORS configuration — validate every configured origin at boot.
  const corsOrigins = config.CORS_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  if (corsOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must list at least one origin');
  }

  for (const origin of corsOrigins) {
    try {
      // eslint-disable-next-line no-new
      new URL(origin);
    } catch {
      throw new Error(`Invalid CORS origin: ${origin}`);
    }
  }

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Cookie parser — required for the refresh-token flow which reads
  // req.cookies.refresh_token. Without this, every reload would log the user
  // out because /auth/refresh would 401 with REFRESH_TOKEN_MISSING.
  app.use(cookieParser());

  // MongoDB sanitize (prevent NoSQL injection)
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.body) {
      mongoSanitize(req.body);
    }
    if (req.query) {
      mongoSanitize(req.query);
    }
    if (req.params) {
      mongoSanitize(req.params);
    }
    next();
  });

  // Pino HTTP logger
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/api/v1/health',
      },
    })
  );

  // Global rate limiter — disabled in development so HMR/SPA traffic doesn't
  // trip the limit. Auth routes still have their own limiter (authRateLimiter).
  if (config.NODE_ENV === 'production') {
    app.use(rateLimiter);
  }

  // Health check endpoint
  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Metrics endpoint
  app.get('/api/v1/metrics', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // Mount route modules
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/public', publicRoutes);
  app.use('/api/v1/seeker', seekerRoutes);
  app.use('/api/v1/company', companyRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/official', officialRoutes);
  app.use('/api/v1/support', supportRoutes);
  app.use('/api/v1/notifications', notificationsRoutes);
  app.use('/api/v1/track', trackingRoutes);

  // Serve uploaded files. Helmet's default Cross-Origin-Resource-Policy is
  // `same-origin`, which would block the frontend (different port = different
  // origin) from rendering avatars/resumes via <img src> or downloads. Override
  // it only on this path so the rest of the API keeps the strict default.
  app.use(
    '/uploads',
    (_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    },
    express.static(path.join(process.cwd(), 'uploads'))
  );

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      status: 'error',
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

export default createApp;

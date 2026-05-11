import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(3000),

  // MongoDB
  MONGODB_URI: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_SERVICE_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.coerce.string().default('15m'),
  JWT_REFRESH_TTL: z.coerce.string().default('30d'),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),

  // AWS S3
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_S3_BUCKET: z.string().optional(),

  // Google Maps
  GOOGLE_MAPS_SERVER_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),

  // Sentry
  SENTRY_DSN: z.string().optional(),

  // Frontend
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Backend public base URL (used to build tracking links inside emails). In
  // production this should be the public origin of the API, e.g.
  // https://api.hirely.com — without trailing slash and without the /api/v1
  // path component (the route module adds those).
  BACKEND_BASE_URL: z.string().url().default('http://localhost:3000'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(1500),

  // TOTP
  TOTP_ISSUER: z.string().default('Hirely'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const config = parsed.data;

export default config;

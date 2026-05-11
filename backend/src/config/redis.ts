import Redis from 'ioredis';
import pino from 'pino';
import config from './env.ts';

const logger = pino({ name: 'redis' });

const REDIS_URL = config.REDIS_URL;

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    logger.info('Redis disconnected gracefully');
  } catch (error) {
    logger.error({ err: error }, 'Error disconnecting Redis');
    throw error;
  }
}

export default redis;

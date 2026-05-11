import mongoose from 'mongoose';
import pino from 'pino';
import config from './env.js';
import dns from 'dns';

// Use Google DNS to avoid system DNS issues
dns.setServers(['8.8.8.8', '8.8.4.4']);

const logger = pino({ name: 'database' });

const MONGODB_URI = config.MONGODB_URI;

let isConnected = false;

export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    logger.info('Using existing MongoDB connection');
    return;
  }

  try {
   const conn = await mongoose.connect(MONGODB_URI, {
      dbName: 'hirely',
    });

    isConnected = true;
    logger.info({ host: conn.connection.host }, 'MongoDB connected successfully');
  } catch (error) {
    logger.error({ err: error }, 'MongoDB connection failed');
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected gracefully');
  } catch (error) {
    logger.error({ err: error }, 'Error disconnecting MongoDB');
    throw error;
  }
}

// Graceful shutdown handlers
export function setupGracefulShutdown(): void {
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info({ signal }, 'Received shutdown signal');
      await disconnectDatabase();
      process.exit(0);
    });
  });

  process.on('uncaughtException', async (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    await disconnectDatabase();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection');
    await disconnectDatabase();
    process.exit(1);
  });
}

export default {
  connectDatabase,
  disconnectDatabase,
  setupGracefulShutdown,
};

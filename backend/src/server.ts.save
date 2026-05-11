import http from 'http';
import pino from 'pino';
import config from './config/env.js';
import { connectDatabase, setupGracefulShutdown } from './config/database.js';
import { disconnectRedis } from './config/redis.js';
import { createApp } from './app.js';
import { seedSystemRolesAndBackfill } from './scripts/seed-roles.js';
import { initSocket } from './realtime/socket.js';
import { ticketTemplateService } from './modules/admin/ticketTemplate.service.js';

const logger = pino({ name: 'server' });

async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Setup graceful shutdown
    setupGracefulShutdown();

    // Ensure system roles exist + backfill admin_role_id on legacy admins.
    try {
      const result = await seedSystemRolesAndBackfill();
      logger.info(result, 'System roles seeded');
    } catch (err) {
      logger.error({ err }, 'Failed to seed system roles (continuing anyway)');
    }

    // Seed default ticket templates so the admin quick-reply menu has content
    // out of the box. Idempotent — only inserts names that don't exist yet.
    try {
      const result = await ticketTemplateService.seedDefaults();
      logger.info(result, 'Ticket templates seeded');
    } catch (err) {
      logger.error({ err }, 'Failed to seed ticket templates (continuing anyway)');
    }

    // Create Express app + wrap in HTTP server so Socket.io can attach.
    const app = createApp();
    const httpServer = http.createServer(app);
    initSocket(httpServer);

    // Start server
    const port = config.PORT;
    const server = httpServer.listen(port, () => {
      logger.info({ port, env: config.NODE_ENV }, 'Server started (HTTP + Socket.io)');
    });

    // Graceful shutdown for server
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutdown signal received');

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await disconnectRedis();
          logger.info('Redis disconnected');
        } catch (err) {
          logger.error({ err }, 'Error disconnecting Redis');
        }

        process.exit(0);
      });

      // Force exit after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();

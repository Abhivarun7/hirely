import { Worker, Job } from 'bullmq';
import pino from 'pino';
import { redis } from '../config/redis.js';
import { Notification } from '../models/Notification.js';

const logger = pino({ name: 'notification-worker' });

// ─── Job Data Types ───────────────────────────────────────────────────────────

export interface NotificationJobData {
  userId: string;
  type?: string;
  title: string;
  body?: string;
  link?: string;
}

// ─── Worker ─────────────────────────────────────────────────────────────────────

const notificationWorker = new Worker<NotificationJobData>(
  'notification-queue',
  async (job: Job<NotificationJobData>) => {
    const { userId, type, title, body, link } = job.data;

    logger.info({ jobId: job.id, userId, type, title }, 'Processing notification job');

    try {
      const notification = await Notification.create({
        user_id: userId,
        type,
        title,
        body,
        link,
        is_read: false,
      });

      logger.info(
        { jobId: job.id, notificationId: notification._id },
        'Notification created successfully'
      );

      return { notificationId: notification._id.toString() };
    } catch (error) {
      logger.error(
        { jobId: job.id, error: (error as Error).message },
        'Failed to create notification'
      );
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 10,
  }
);

// ─── Error Handling ───────────────────────────────────────────────────────────

notificationWorker.on('failed', (job, error) => {
  logger.error(
    { jobId: job?.id, attemptsMade: job?.attemptsMade, error: error.message },
    'Notification job failed'
  );
});

notificationWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Notification job completed');
});

notificationWorker.on('error', (error) => {
  logger.error({ error: error.message }, 'Notification worker error');
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

export async function closeNotificationWorker() {
  await notificationWorker.close();
  logger.info('Notification worker closed');
}

export default notificationWorker;

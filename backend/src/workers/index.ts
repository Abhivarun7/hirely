// Email is sent inline via nodemailer (see modules/shared/email.service.ts).
// Only the notification worker remains queue-driven.
export { default as notificationWorker } from './notification.worker.js';
export { closeNotificationWorker } from './notification.worker.js';

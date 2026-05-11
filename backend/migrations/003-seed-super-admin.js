/* eslint-disable @typescript-eslint/no-explicit-any */

module.exports = {
  async up(db: any) {
    // Default values - can be overridden via env vars
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@hirely.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'SeededPassword123!';

    // bcrypt cost 12 as per auth module conventions
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const now = new Date();

    const superAdmin = {
      email: adminEmail.toLowerCase(),
      password_hash: passwordHash,
      role: 'super_admin',
      is_email_verified: true,
      is_active: true,
      is_banned: false,
      totp_enabled: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('users').insertOne(superAdmin);
  },

  async down(db: any) {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@hirely.com').toLowerCase();
    await db.collection('users').deleteOne({ email: adminEmail, role: 'super_admin' });
  },
};
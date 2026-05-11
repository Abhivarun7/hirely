/**
 * Admin user seed script.
 * Run with: npm run seed
 *
 * Creates a super_admin and a moderator account on first run.
 * Skips accounts that already exist (safe to re-run).
 *
 * Credentials can be overridden via environment variables:
 *   SEED_SUPER_ADMIN_EMAIL    (default: admin@hirely.com)
 *   SEED_SUPER_ADMIN_PASSWORD (default: Admin@1234)
 *   SEED_MODERATOR_EMAIL      (default: moderator@hirely.com)
 *   SEED_MODERATOR_PASSWORD   (default: Mod@1234)
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/User.js';

interface SeedAdmin {
  email: string;
  password: string;
  role: 'super_admin' | 'moderator' | 'support_admin' | 'analytics_admin';
}

const admins: SeedAdmin[] = [
  {
    email: process.env.SEED_SUPER_ADMIN_EMAIL ?? 'ram8374041@gmail.com',
    password: process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'Admin123',
    role: 'super_admin',
  },
  {
    email: process.env.SEED_MODERATOR_EMAIL ?? 'moderator@hirely.com',
    password: process.env.SEED_MODERATOR_PASSWORD ?? 'Mod@1234',
    role: 'moderator',
  },
];

async function seed() {
  console.log('🌱  Starting admin seed...\n');

  await connectDatabase();

  let created = 0;
  let skipped = 0;

  for (const admin of admins) {
    const existing = await User.findOne({ email: admin.email });

    if (existing) {
      console.log(`  ⏭  Skipped  [${admin.role}]  ${admin.email}  (already exists)`);
      skipped++;
      continue;
    }

    const password_hash = await bcrypt.hash(admin.password, 12);

    await User.create({
      email: admin.email,
      password_hash,
      role: admin.role,
      is_email_verified: true,
      is_active: true,
      is_banned: false,
      totp_enabled: false,
    });

    console.log(`  ✅  Created  [${admin.role}]  ${admin.email}`);
    created++;
  }

  console.log(`\n  Done — ${created} created, ${skipped} skipped.\n`);

  if (created > 0) {
    console.log('  Admin credentials:');
    for (const admin of admins) {
      console.log(`    ${admin.role.padEnd(16)}  ${admin.email}  /  ${admin.password}`);
    }
    console.log('\n  ⚠️  Change these passwords after first login.\n');
  }

  await disconnectDatabase();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});

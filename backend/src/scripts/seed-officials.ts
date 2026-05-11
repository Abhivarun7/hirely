/**
 * Employment Official seed script.
 * Run with: npm run seed:officials
 *
 * Creates one employment_official user + profile. Idempotent — skips if the
 * user already exists.
 *
 * Overrides via env:
 *   SEED_OFFICIAL_EMAIL     (default: official@hirely.com)
 *   SEED_OFFICIAL_PASSWORD  (default: Admin123)
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { EmploymentOfficialProfile } from '../models/EmploymentOfficialProfile.js';

const EMAIL = process.env.SEED_OFFICIAL_EMAIL ?? 'official@hirely.com';
const PASSWORD = process.env.SEED_OFFICIAL_PASSWORD ?? 'Admin123';

async function seed() {
  console.log('🌱  Seeding employment official...\n');
  await connectDatabase();

  const existing = await User.findOne({ email: EMAIL });
  if (existing) {
    console.log(`  ⏭  Skipped — ${EMAIL} already exists.\n`);
    await disconnectDatabase();
    return;
  }

  // Pick the first super_admin as the "creator" so created_by_admin_id is valid.
  const admin = await User.findOne({ role: 'super_admin' }).select('_id').lean();
  if (!admin) {
    console.error('  ❌  No super_admin found. Run `npm run seed` first.\n');
    await disconnectDatabase();
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(PASSWORD, 12);

  const user = await User.create({
    email: EMAIL,
    password_hash,
    role: 'employment_official',
    is_email_verified: true,
    is_active: true,
    is_banned: false,
    totp_enabled: false,
  });

  const profile = await EmploymentOfficialProfile.create({
    user_id: user._id,
    first_name: 'Demo',
    last_name: 'Official',
    designation: 'District Employment Officer',
    phone: '+91-9999999999',
    address: 'Connaught Place',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.2090,
    search_radius_km: 100,
    created_by_admin_id: admin._id,
    is_active: true,
  });

  user.official_profile_id = profile._id;
  await user.save();

  console.log(`  ✅  Created employment_official\n`);
  console.log(`     Email:     ${EMAIL}`);
  console.log(`     Password:  ${PASSWORD}`);
  console.log(`     Location:  New Delhi (28.6139, 77.2090)`);
  console.log(`     Radius:    100 km`);
  console.log(`\n  ⚠️  Change this password after first login.\n`);

  await disconnectDatabase();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});

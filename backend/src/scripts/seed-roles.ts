/**
 * Idempotent seed for system roles + backfill for existing admins.
 *
 * Run via:
 *   npx tsx src/scripts/seed-roles.ts
 *
 * The same logic also runs at server boot (see app.ts) so a fresh DB is
 * always usable without invoking this script manually.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Role, User } from '../models/index.js';
import {
  SYSTEM_ROLE_PERMISSIONS,
  SYSTEM_ROLE_DESCRIPTIONS,
  type SystemRoleName,
} from '../constants/permissions.js';

const SYSTEM_ROLE_NAMES: SystemRoleName[] = [
  'super_admin',
  'moderator',
  'support_admin',
  'analytics_admin',
];

export async function seedSystemRolesAndBackfill(): Promise<{
  rolesUpserted: number;
  adminsBackfilled: number;
}> {
  let rolesUpserted = 0;
  let adminsBackfilled = 0;

  for (const name of SYSTEM_ROLE_NAMES) {
    const existing = await Role.findOne({ name });
    const permissions = SYSTEM_ROLE_PERMISSIONS[name];
    const description = SYSTEM_ROLE_DESCRIPTIONS[name];

    if (!existing) {
      await Role.create({ name, description, permissions, is_system: true });
      rolesUpserted++;
    } else if (
      existing.is_system &&
      (existing.permissions.length !== permissions.length ||
        !permissions.every((p) => existing.permissions.includes(p)))
    ) {
      // Keep system role permissions in sync with the catalog.
      existing.permissions = permissions;
      existing.description = description;
      existing.is_system = true;
      await existing.save();
      rolesUpserted++;
    }
  }

  // Backfill admin_role_id for any admin User missing it.
  for (const name of SYSTEM_ROLE_NAMES) {
    const role = await Role.findOne({ name }).select('_id').lean();
    if (!role) continue;
    const result = await User.updateMany(
      { role: name, $or: [{ admin_role_id: { $exists: false } }, { admin_role_id: null }] },
      { $set: { admin_role_id: role._id } }
    );
    adminsBackfilled += result.modifiedCount ?? 0;
  }

  return { rolesUpserted, adminsBackfilled };
}

// Allow direct execution
const isMain = process.argv[1]?.endsWith('seed-roles.ts') || process.argv[1]?.endsWith('seed-roles.js');
if (isMain) {
  (async () => {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI is not set');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    const result = await seedSystemRolesAndBackfill();
    console.log('System roles seeded:', result);
    await mongoose.disconnect();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

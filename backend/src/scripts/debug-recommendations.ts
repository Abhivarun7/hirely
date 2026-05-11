/**
 * One-shot: list users belonging to a company by name.
 *
 * Usage: npx tsx src/scripts/debug-recommendations.ts <company-name-substring>
 */
import { connectDatabase } from '../config/database.js';
import { Company, User, CompanyBranch } from '../models/index.js';

async function main(): Promise<void> {
  const needle = process.argv[2] ?? 'Swiggy';
  await connectDatabase();

  const companies = await Company.find({ name: { $regex: needle, $options: 'i' } }).lean();
  if (companies.length === 0) {
    console.log(`No company matching "${needle}"`);
    process.exit(0);
  }

  for (const c of companies) {
    console.log(`\n=== ${c.name}  (id=${c._id}, status=${c.approval_status}) ===`);
    const users = await User.find({ company_id: c._id })
      .select('email role branch_id is_active is_banned is_email_verified createdAt')
      .lean();
    if (users.length === 0) {
      console.log('  (no users)');
      continue;
    }
    const branchIds = users.map((u) => u.branch_id).filter(Boolean);
    const branches = branchIds.length
      ? await CompanyBranch.find({ _id: { $in: branchIds } }).select('name city').lean()
      : [];
    const branchById = new Map(branches.map((b) => [b._id.toString(), b]));

    for (const u of users) {
      const branch = u.branch_id ? branchById.get(u.branch_id.toString()) : null;
      const branchLabel = branch ? `  branch=${branch.name} (${branch.city})` : '';
      console.log(
        `  - ${u.email.padEnd(34)} role=${u.role.padEnd(14)} active=${u.is_active} banned=${u.is_banned} verified=${u.is_email_verified}${branchLabel}`
      );
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

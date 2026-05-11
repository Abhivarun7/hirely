/**
 * One-shot helper used during development to clear the seeded Razorpay/Swiggy
 * data so the main seed script can be re-run from a clean slate. Not exposed
 * via npm scripts intentionally — invoke directly with tsx if needed.
 */

import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Company, CompanyBranch, Job, JobSkill, User } from '../models/index.js';

async function run(): Promise<void> {
  await connectDatabase();
  const companies = await Company.find({ slug: { $in: ['razorpay', 'swiggy'] } }).select('_id').lean();
  const ids = companies.map((c) => c._id);
  if (ids.length === 0) {
    console.log('Nothing to wipe.');
  } else {
    const jobs = await Job.find({ company_id: { $in: ids } }).select('_id').lean();
    const jobIds = jobs.map((j) => j._id);
    await JobSkill.deleteMany({ job_id: { $in: jobIds } });
    await Job.deleteMany({ company_id: { $in: ids } });
    await CompanyBranch.deleteMany({ company_id: { $in: ids } });
    await Company.deleteMany({ _id: { $in: ids } });
    await User.deleteMany({ email: { $in: ['owner@razorpay.example.com', 'owner@swiggy.example.com'] } });
    console.log(`Wiped ${ids.length} companies, ${jobIds.length} jobs, related branches/skills/owners.`);
  }
  await disconnectDatabase();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

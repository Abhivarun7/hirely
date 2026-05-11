// Quick diagnostic for JobView tracking. Run from backend/:
//   node scripts/check-job-views.mjs "Staff Backend Engineer"
//
// Prints: total JobView count, last 5 events, views_count + JobView count for
// any job whose title matches the argument (case-insensitive), and the
// company-scoped count over the last 30 days (matches dashboard 30d period).

import 'dotenv/config';
import mongoose from 'mongoose';

const { Schema } = mongoose;

const Job = mongoose.model(
  'Job',
  new Schema({ title: String, company_id: Schema.Types.ObjectId, views_count: Number }, { strict: false, timestamps: true })
);
const JobView = mongoose.model(
  'JobView',
  new Schema(
    {
      job_id: Schema.Types.ObjectId,
      company_id: Schema.Types.ObjectId,
      viewer_key: String,
      viewer_type: String,
      source: String,
      ts: Date,
    },
    { strict: false, collection: 'jobviews' }
  )
);
const Company = mongoose.model('Company', new Schema({ name: String }, { strict: false, timestamps: true }));

const titleQuery = process.argv[2] || 'Staff Backend Engineer';

await mongoose.connect(process.env.MONGODB_URI);

const totalViews = await JobView.estimatedDocumentCount();
console.log(`\nTotal JobView docs in collection: ${totalViews}`);

const recent = await JobView.find().sort({ ts: -1 }).limit(5).lean();
console.log('\nLast 5 JobView events:');
if (recent.length === 0) console.log('  (none — view tracking has never fired)');
for (const v of recent) {
  console.log(
    `  ${v.ts?.toISOString()}  ${v.source?.padEnd(7)} ${v.viewer_type?.padEnd(13)} job=${v.job_id} viewer=${v.viewer_key?.slice(0, 24)}`
  );
}

const jobs = await Job.find({ title: { $regex: titleQuery, $options: 'i' } })
  .select('title company_id views_count')
  .lean();
console.log(`\nJobs matching "${titleQuery}": ${jobs.length}`);
for (const j of jobs) {
  const company = await Company.findById(j.company_id).select('name').lean();
  const viewCount = await JobView.countDocuments({ job_id: j._id });
  const last24h = await JobView.countDocuments({
    job_id: j._id,
    ts: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });
  console.log(`  - ${j.title}`);
  console.log(`    company:        ${company?.name ?? '(unknown)'}  (${j.company_id})`);
  console.log(`    views_count:    ${j.views_count ?? 0}   <- counter incremented by recordJobView`);
  console.log(`    JobView docs:   ${viewCount}   (last 24h: ${last24h})`);
}

const razorpay = await Company.findOne({ name: { $regex: /razorpay/i } })
  .select('name')
  .lean();
if (razorpay) {
  const last30d = await JobView.countDocuments({
    company_id: razorpay._id,
    ts: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  });
  console.log(`\nRazorpay (${razorpay._id}) — JobView in last 30d: ${last30d}`);
}

await mongoose.disconnect();
console.log('\nDone.');

/**
 * Seeker seed script — creates 9 job-seeker users across three quality tiers
 * so the admin AI Insights screen has something realistic to chew on.
 *
 *   - 3 GOOD     : senior-level, polished profiles, expert skills, multiple roles
 *   - 3 AVERAGE  : mid-level, intermediate skills, some experience
 *   - 3 BAD      : sparse profile, beginner skills, applying way above their level
 *
 * Run with: npx tsx src/scripts/seed-seekers.ts
 *
 * Safe to re-run — existing emails are skipped.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import {
  User,
  SeekerProfile,
  SeekerSkill,
  WorkExperience,
  Education,
  SkillTag,
  Job,
  Resume,
  Application,
} from '../models/index.js';

type Tier = 'good' | 'average' | 'bad';

interface ExperienceSeed {
  job_title: string;
  company_name: string;
  location?: string;
  start_date: Date;
  end_date?: Date;
  is_current?: boolean;
  description?: string;
}

interface EducationSeed {
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: Date;
  end_date?: Date;
  gpa?: number;
}

interface SeekerSeed {
  tier: Tier;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  headline: string;
  bio: string;
  city: string;
  country: string;
  profile_complete_pct: number;
  skills: { name: string; proficiency: 'beginner' | 'intermediate' | 'expert' }[];
  experience: ExperienceSeed[];
  education: EducationSeed[];
  /** keywords used to pick which existing jobs to "apply" to (best-effort) */
  application_targets: string[];
}

function years(n: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
}

const seekers: SeekerSeed[] = [
  // ============ GOOD ============
  {
    tier: 'good',
    email: 'priya.senior@example.com',
    password: 'Seeker@1234',
    first_name: 'Priya',
    last_name: 'Sharma',
    headline: 'Senior Full-Stack Engineer | React, Node.js, AWS',
    bio: '8+ years building scalable web platforms. Led teams of 4-6 engineers at two startups. Strong in system design, code review, and mentoring. Comfortable across the stack from React UI work to designing event-driven backends.',
    city: 'Bengaluru',
    country: 'India',
    profile_complete_pct: 95,
    skills: [
      { name: 'React', proficiency: 'expert' },
      { name: 'TypeScript', proficiency: 'expert' },
      { name: 'Node.js', proficiency: 'expert' },
      { name: 'AWS', proficiency: 'expert' },
      { name: 'PostgreSQL', proficiency: 'expert' },
      { name: 'System Design', proficiency: 'expert' },
      { name: 'Docker', proficiency: 'intermediate' },
      { name: 'Kubernetes', proficiency: 'intermediate' },
    ],
    experience: [
      {
        job_title: 'Senior Software Engineer',
        company_name: 'Razorpay',
        location: 'Bengaluru, India',
        start_date: years(3),
        is_current: true,
        description:
          'Lead engineer on the merchant dashboard. Migrated a monolith to a service-oriented architecture, cutting p95 latency by 40%. Mentored 3 junior engineers.',
      },
      {
        job_title: 'Software Engineer II',
        company_name: 'Flipkart',
        location: 'Bengaluru, India',
        start_date: years(6),
        end_date: years(3),
        description:
          'Built checkout features used by 100M+ users. Owned the cart service end-to-end. Drove a switch to TypeScript that reduced production bugs.',
      },
      {
        job_title: 'Software Engineer',
        company_name: 'Zoho',
        location: 'Chennai, India',
        start_date: years(8),
        end_date: years(6),
        description:
          'CRM team. Shipped a customer dashboard rewrite in React. First production exposure to building APIs at scale.',
      },
    ],
    education: [
      {
        institution: 'IIT Madras',
        degree: 'B.Tech',
        field_of_study: 'Computer Science',
        start_date: years(13),
        end_date: years(9),
        gpa: 8.7,
      },
    ],
    application_targets: ['senior', 'engineer', 'developer', 'full', 'react', 'node'],
  },
  {
    tier: 'good',
    email: 'arjun.devops@example.com',
    password: 'Seeker@1234',
    first_name: 'Arjun',
    last_name: 'Reddy',
    headline: 'Staff DevOps Engineer | Kubernetes, AWS, Terraform',
    bio: '10 years in infrastructure. Built CI/CD platforms used by 200+ engineers. Deep AWS expertise, certified Solutions Architect Pro. Speaks at meetups about Kubernetes operations.',
    city: 'Hyderabad',
    country: 'India',
    profile_complete_pct: 92,
    skills: [
      { name: 'AWS', proficiency: 'expert' },
      { name: 'Kubernetes', proficiency: 'expert' },
      { name: 'Terraform', proficiency: 'expert' },
      { name: 'Docker', proficiency: 'expert' },
      { name: 'Linux', proficiency: 'expert' },
      { name: 'Python', proficiency: 'expert' },
      { name: 'Go', proficiency: 'intermediate' },
      { name: 'PostgreSQL', proficiency: 'intermediate' },
    ],
    experience: [
      {
        job_title: 'Staff DevOps Engineer',
        company_name: 'Swiggy',
        location: 'Hyderabad, India',
        start_date: years(4),
        is_current: true,
        description:
          'Owns the multi-region Kubernetes platform. Cut infra cost 22% via right-sizing and spot instances. On-call lead.',
      },
      {
        job_title: 'Senior SRE',
        company_name: 'Paytm',
        location: 'Noida, India',
        start_date: years(7),
        end_date: years(4),
        description: 'Scaled the payments platform through a 5x traffic ramp. Built incident response playbooks now used company-wide.',
      },
      {
        job_title: 'DevOps Engineer',
        company_name: 'Infosys',
        location: 'Pune, India',
        start_date: years(10),
        end_date: years(7),
      },
    ],
    education: [
      {
        institution: 'BITS Pilani',
        degree: 'B.E.',
        field_of_study: 'Computer Science',
        start_date: years(15),
        end_date: years(11),
        gpa: 8.4,
      },
    ],
    application_targets: ['devops', 'sre', 'infrastructure', 'platform', 'kubernetes'],
  },
  {
    tier: 'good',
    email: 'meera.data@example.com',
    password: 'Seeker@1234',
    first_name: 'Meera',
    last_name: 'Iyer',
    headline: 'Senior Data Scientist | NLP, ML Platforms',
    bio: '6 years building production ML systems. Published two papers on retrieval-augmented systems. Comfortable both in research notebooks and shipping models behind low-latency APIs.',
    city: 'Pune',
    country: 'India',
    profile_complete_pct: 90,
    skills: [
      { name: 'Python', proficiency: 'expert' },
      { name: 'Machine Learning', proficiency: 'expert' },
      { name: 'PyTorch', proficiency: 'expert' },
      { name: 'NLP', proficiency: 'expert' },
      { name: 'SQL', proficiency: 'expert' },
      { name: 'AWS', proficiency: 'intermediate' },
      { name: 'Docker', proficiency: 'intermediate' },
    ],
    experience: [
      {
        job_title: 'Senior Data Scientist',
        company_name: 'Freshworks',
        location: 'Chennai, India',
        start_date: years(2),
        is_current: true,
        description:
          'Lead on the customer-support copilot. Owns model training, evaluation, and the production inference pipeline.',
      },
      {
        job_title: 'Data Scientist',
        company_name: 'Myntra',
        location: 'Bengaluru, India',
        start_date: years(5),
        end_date: years(2),
        description:
          'Recommendations team. Improved click-through on the home feed by 7% with a new ranking model.',
      },
      {
        job_title: 'ML Engineer',
        company_name: 'Mu Sigma',
        location: 'Bengaluru, India',
        start_date: years(6),
        end_date: years(5),
      },
    ],
    education: [
      {
        institution: 'IIIT Hyderabad',
        degree: 'M.Tech',
        field_of_study: 'Computer Science (ML)',
        start_date: years(8),
        end_date: years(6),
        gpa: 9.0,
      },
      {
        institution: 'College of Engineering Pune',
        degree: 'B.Tech',
        field_of_study: 'Information Technology',
        start_date: years(12),
        end_date: years(8),
        gpa: 8.5,
      },
    ],
    application_targets: ['data', 'machine learning', 'ml', 'scientist', 'ai'],
  },

  // ============ AVERAGE ============
  {
    tier: 'average',
    email: 'rohit.midfe@example.com',
    password: 'Seeker@1234',
    first_name: 'Rohit',
    last_name: 'Verma',
    headline: 'Frontend Developer | React',
    bio: 'Frontend developer with around 3 years of experience in React. Currently learning TypeScript and trying to grow into a full-stack role.',
    city: 'Delhi',
    country: 'India',
    profile_complete_pct: 65,
    skills: [
      { name: 'React', proficiency: 'intermediate' },
      { name: 'JavaScript', proficiency: 'intermediate' },
      { name: 'TypeScript', proficiency: 'beginner' },
      { name: 'CSS', proficiency: 'intermediate' },
      { name: 'HTML', proficiency: 'expert' },
      { name: 'Node.js', proficiency: 'beginner' },
    ],
    experience: [
      {
        job_title: 'Frontend Developer',
        company_name: 'Cuemath',
        location: 'Delhi, India',
        start_date: years(2),
        is_current: true,
        description: 'Building dashboards for tutors. Mostly React + Tailwind work.',
      },
      {
        job_title: 'Junior Web Developer',
        company_name: 'TCS',
        location: 'Delhi, India',
        start_date: years(3),
        end_date: years(2),
      },
    ],
    education: [
      {
        institution: 'Delhi Technological University',
        degree: 'B.Tech',
        field_of_study: 'Information Technology',
        start_date: years(7),
        end_date: years(3),
        gpa: 7.6,
      },
    ],
    application_targets: ['frontend', 'react', 'full', 'developer'],
  },
  {
    tier: 'average',
    email: 'sneha.qa@example.com',
    password: 'Seeker@1234',
    first_name: 'Sneha',
    last_name: 'Patel',
    headline: 'QA Engineer transitioning to SDET',
    bio: 'Manual QA for 4 years, now learning Selenium and Playwright. Looking for an SDET role where I can ramp up on automation.',
    city: 'Ahmedabad',
    country: 'India',
    profile_complete_pct: 60,
    skills: [
      { name: 'Manual Testing', proficiency: 'expert' },
      { name: 'Selenium', proficiency: 'intermediate' },
      { name: 'Playwright', proficiency: 'beginner' },
      { name: 'JIRA', proficiency: 'expert' },
      { name: 'JavaScript', proficiency: 'beginner' },
      { name: 'SQL', proficiency: 'intermediate' },
    ],
    experience: [
      {
        job_title: 'QA Engineer',
        company_name: 'Capgemini',
        location: 'Ahmedabad, India',
        start_date: years(4),
        is_current: true,
        description: 'Functional and regression testing for an insurance product.',
      },
    ],
    education: [
      {
        institution: 'Gujarat Technological University',
        degree: 'B.E.',
        field_of_study: 'Computer Engineering',
        start_date: years(8),
        end_date: years(4),
        gpa: 7.1,
      },
    ],
    application_targets: ['qa', 'test', 'sdet', 'automation', 'engineer'],
  },
  {
    tier: 'average',
    email: 'kiran.android@example.com',
    password: 'Seeker@1234',
    first_name: 'Kiran',
    last_name: 'Nair',
    headline: 'Android Developer | Kotlin',
    bio: '3 years of Android development. Comfortable shipping features, less experience with architecture decisions or performance work.',
    city: 'Kochi',
    country: 'India',
    profile_complete_pct: 55,
    skills: [
      { name: 'Kotlin', proficiency: 'intermediate' },
      { name: 'Android', proficiency: 'intermediate' },
      { name: 'Java', proficiency: 'intermediate' },
      { name: 'Firebase', proficiency: 'intermediate' },
      { name: 'Git', proficiency: 'intermediate' },
    ],
    experience: [
      {
        job_title: 'Android Developer',
        company_name: 'UST Global',
        location: 'Kochi, India',
        start_date: years(3),
        is_current: true,
        description: 'Working on a banking app. Mostly feature work in an existing codebase.',
      },
    ],
    education: [
      {
        institution: 'CUSAT',
        degree: 'B.Tech',
        field_of_study: 'Computer Science',
        start_date: years(7),
        end_date: years(3),
        gpa: 7.4,
      },
    ],
    application_targets: ['android', 'mobile', 'kotlin', 'developer'],
  },

  // ============ BAD ============
  {
    tier: 'bad',
    email: 'amit.fresher@example.com',
    password: 'Seeker@1234',
    first_name: 'Amit',
    last_name: 'Kumar',
    headline: 'Aspiring Senior Full-Stack Architect',
    bio: 'Recent graduate. Did one online bootcamp. Looking for senior architect roles to grow fast.',
    city: 'Patna',
    country: 'India',
    profile_complete_pct: 30,
    skills: [
      { name: 'HTML', proficiency: 'beginner' },
      { name: 'CSS', proficiency: 'beginner' },
      { name: 'JavaScript', proficiency: 'beginner' },
      { name: 'React', proficiency: 'beginner' },
    ],
    experience: [
      {
        job_title: 'Intern',
        company_name: 'Local Web Studio',
        location: 'Patna, India',
        start_date: years(1),
        end_date: undefined,
        is_current: false,
        description: 'Two-month internship. Built a small landing page.',
      },
    ],
    education: [
      {
        institution: 'Patna University',
        degree: 'B.Sc',
        field_of_study: 'Computer Applications',
        start_date: years(4),
        end_date: years(1),
        gpa: 6.0,
      },
    ],
    application_targets: ['senior', 'architect', 'lead', 'principal'],
  },
  {
    tier: 'bad',
    email: 'deepa.career-switch@example.com',
    password: 'Seeker@1234',
    first_name: 'Deepa',
    last_name: 'Joshi',
    headline: 'Looking for ML Lead role',
    bio: 'Switching from accounting to ML. Watched a few YouTube tutorials. Excited to lead ML teams.',
    city: 'Indore',
    country: 'India',
    profile_complete_pct: 25,
    skills: [
      { name: 'Python', proficiency: 'beginner' },
      { name: 'Excel', proficiency: 'expert' },
      { name: 'Machine Learning', proficiency: 'beginner' },
    ],
    experience: [
      {
        job_title: 'Accountant',
        company_name: 'Local CA Firm',
        location: 'Indore, India',
        start_date: years(5),
        is_current: true,
        description: 'Bookkeeping and tax filings.',
      },
    ],
    education: [
      {
        institution: 'DAVV Indore',
        degree: 'B.Com',
        field_of_study: 'Commerce',
        start_date: years(9),
        end_date: years(5),
      },
    ],
    application_targets: ['lead', 'machine learning', 'data science', 'ai'],
  },
  {
    tier: 'bad',
    email: 'sahil.devops-dream@example.com',
    password: 'Seeker@1234',
    first_name: 'Sahil',
    last_name: 'Khan',
    headline: 'DevOps Engineer (Self-taught)',
    bio: 'Heard DevOps pays well. Installed Docker once. Ready to manage Kubernetes clusters.',
    city: 'Lucknow',
    country: 'India',
    profile_complete_pct: 20,
    skills: [
      { name: 'Linux', proficiency: 'beginner' },
      { name: 'Docker', proficiency: 'beginner' },
      { name: 'Git', proficiency: 'beginner' },
    ],
    experience: [
      {
        job_title: 'Support Engineer',
        company_name: 'Local ISP',
        location: 'Lucknow, India',
        start_date: years(2),
        is_current: true,
        description: 'Resetting routers and resolving customer tickets.',
      },
    ],
    education: [
      {
        institution: 'Lucknow University',
        degree: 'BCA',
        field_of_study: 'Computer Applications',
        start_date: years(5),
        end_date: years(2),
      },
    ],
    application_targets: ['devops', 'sre', 'kubernetes', 'cloud', 'platform'],
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function getOrCreateSkillTag(name: string): Promise<mongoose.Types.ObjectId> {
  const existing = await SkillTag.findOne({ name });
  if (existing) return existing._id as mongoose.Types.ObjectId;
  const created = await SkillTag.create({ name, slug: slugify(name) });
  return created._id as mongoose.Types.ObjectId;
}

async function pickJobsForTargets(targets: string[], max: number): Promise<mongoose.Types.ObjectId[]> {
  if (!targets.length) return [];
  const regex = new RegExp(targets.join('|'), 'i');
  const jobs = await Job.find({
    status: 'active',
    $or: [{ title: regex }, { description: regex }],
  })
    .limit(max)
    .select('_id')
    .lean();
  return jobs.map((j) => j._id as mongoose.Types.ObjectId);
}

async function ensureResume(seekerId: mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId> {
  const existing = await Resume.findOne({ seeker_id: seekerId });
  if (existing) return existing._id as mongoose.Types.ObjectId;
  const created = await Resume.create({
    seeker_id: seekerId,
    label: 'Default resume',
    original_name: 'resume.pdf',
    file_url: '/uploads/seed/resume-placeholder.pdf',
    is_default: true,
  });
  return created._id as mongoose.Types.ObjectId;
}

async function seed(): Promise<void> {
  console.log('Seeding seekers (good / average / bad)...\n');
  await connectDatabase();

  let created = 0;
  let skipped = 0;
  const summary: { tier: Tier; email: string; status: string }[] = [];

  for (const seed of seekers) {
    const existing = await User.findOne({ email: seed.email });
    if (existing) {
      console.log(`  -  Skipped  [${seed.tier}]   ${seed.email}  (already exists)`);
      summary.push({ tier: seed.tier, email: seed.email, status: 'skipped' });
      skipped++;
      continue;
    }

    const password_hash = await bcrypt.hash(seed.password, 12);

    const user = await User.create({
      email: seed.email,
      password_hash,
      role: 'job_seeker',
      is_email_verified: true,
      is_active: true,
      is_banned: false,
      totp_enabled: false,
    });

    const profile = await SeekerProfile.create({
      user_id: user._id,
      first_name: seed.first_name,
      last_name: seed.last_name,
      headline: seed.headline,
      bio: seed.bio,
      city: seed.city,
      country: seed.country,
      visibility: 'companies_only',
      profile_complete_pct: seed.profile_complete_pct,
    });

    user.seeker_profile_id = profile._id as mongoose.Types.ObjectId;
    await user.save();

    for (const skill of seed.skills) {
      const tagId = await getOrCreateSkillTag(skill.name);
      try {
        await SeekerSkill.create({
          seeker_id: profile._id,
          skill_tag_id: tagId,
          proficiency: skill.proficiency,
        });
      } catch {
        // unique-index conflict — already linked
      }
    }

    if (seed.experience.length) {
      await WorkExperience.insertMany(
        seed.experience.map((e) => ({
          seeker_id: profile._id,
          job_title: e.job_title,
          company_name: e.company_name,
          location: e.location,
          start_date: e.start_date,
          end_date: e.end_date,
          is_current: e.is_current ?? false,
          description: e.description,
        }))
      );
    }

    if (seed.education.length) {
      await Education.insertMany(
        seed.education.map((e) => ({
          seeker_id: profile._id,
          institution: e.institution,
          degree: e.degree,
          field_of_study: e.field_of_study,
          start_date: e.start_date,
          end_date: e.end_date,
          gpa: e.gpa,
        }))
      );
    }

    // Best-effort: attach a couple of applications if jobs exist.
    const jobIds = await pickJobsForTargets(seed.application_targets, 3);
    if (jobIds.length) {
      const resumeId = await ensureResume(profile._id as mongoose.Types.ObjectId);
      for (const jobId of jobIds) {
        try {
          await Application.create({
            job_id: jobId,
            seeker_id: profile._id,
            resume_id: resumeId,
            status: 'applied',
          });
        } catch {
          // unique (job_id, seeker_id) conflict — already applied
        }
      }
    }

    console.log(
      `  +  Created  [${seed.tier}]   ${seed.email.padEnd(34)}  (${seed.skills.length} skills, ${seed.experience.length} jobs, ${jobIds.length} apps)`
    );
    summary.push({ tier: seed.tier, email: seed.email, status: 'created' });
    created++;
  }

  console.log(`\n  Done -- ${created} created, ${skipped} skipped.\n`);

  if (created > 0) {
    console.log('  Seeker credentials (password is the same for all):\n');
    for (const s of summary.filter((x) => x.status === 'created')) {
      console.log(`    [${s.tier.padEnd(7)}]  ${s.email}  /  Seeker@1234`);
    }
    console.log('');
  }

  await disconnectDatabase();
}

seed().catch((err) => {
  console.error('Seeker seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});

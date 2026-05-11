import mongoose from 'mongoose';
import {
  EmploymentOfficialProfile,
  SeekerProfile,
  Job,
  Resume,
  Application,
  Referral,
  ApplicationStatus,
} from '../../models/index.js';
import type { UpdateMeInput, WalkInInput, PushInput } from './official.schema.js';
import { insightsService } from '../company/insights.service.js';

interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  kind?: 'all' | 'registered' | 'walk_in';
}

function paginate(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

async function getProfileForUser(userId: string) {
  return EmploymentOfficialProfile.findOne({ user_id: userId });
}

export const officialService = {
  async getMe(userId: string) {
    const profile = await EmploymentOfficialProfile.findOne({ user_id: userId })
      .populate('user_id', 'email last_login_at')
      .lean();
    return profile;
  },

  async updateMe(userId: string, input: UpdateMeInput) {
    const profile = await getProfileForUser(userId);
    if (!profile) return null;
    Object.assign(profile, input);
    await profile.save();
    return profile.toObject();
  },

async getNearbyJobs(
  userId: string,
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    category_id?: string;
  }
) {
  const profile = await getProfileForUser(userId);
  console.log('profile', profile);

  if (!profile) return null;

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  if (profile.latitude == null || profile.longitude == null) {
    const baseQuery: Record<string, any> = {
      status: 'active',
    };

    if (filters.category_id) {
      baseQuery.category_id = filters.category_id;
    }

    if (filters.search) {
      baseQuery.$text = { $search: filters.search };
    }

    const [jobs, total] = await Promise.all([
      Job.find(baseQuery)
        .populate('company_id', 'name slug logo_url')
        .populate('category_id', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Job.countDocuments(baseQuery),
    ]);

    return {
      jobs,
      pagination: paginate(total, page, limit),
      location_missing: true,
    };
  }

  const radiusMeters = profile.search_radius_km * 1000;

  const findQuery: Record<string, any> = {
    status: 'active',
    'locations.geo': {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [profile.longitude, profile.latitude],
        },
        $maxDistance: radiusMeters,
      },
    },
  };

  const countQuery: Record<string, any> = {
    status: 'active',
    'locations.geo': {
      $geoWithin: {
        $centerSphere: [
          [profile.longitude, profile.latitude],
          radiusMeters / 6378137,
        ],
      },
    },
  };

  if (filters.category_id) {
    findQuery.category_id = filters.category_id;
    countQuery.category_id = filters.category_id;
  }

  if (filters.search) {
    findQuery.$text = { $search: filters.search };
    countQuery.$text = { $search: filters.search };
  }

  const [jobs, total] = await Promise.all([
    Job.find(findQuery)
      .populate('company_id', 'name slug logo_url')
      .populate('category_id', 'name slug')
      .skip(skip)
      .limit(limit)
      .lean(),

    Job.countDocuments(countQuery),
  ]);

  return {
    jobs,
    pagination: paginate(total, page, limit),
  };
},

  async getCandidates(userId: string, filters: ListFilters) {
    const profile = await getProfileForUser(userId);
    if (!profile) return null;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;
    const kind = filters.kind ?? 'all';

    const orClauses: Record<string, unknown>[] = [];

    // Walk-ins this official created — always visible to them.
    if (kind === 'walk_in' || kind === 'all') {
      orClauses.push({ created_by_official_id: new mongoose.Types.ObjectId(userId) });
    }

    // Registered seekers within radius (only if official has a location).
    if ((kind === 'registered' || kind === 'all') && profile.latitude != null && profile.longitude != null) {
      orClauses.push({
        user_id: { $exists: true, $ne: null },
        visibility: { $ne: 'hidden' },
        location: {
          $geoWithin: {
            $centerSphere: [
              [profile.longitude, profile.latitude],
              profile.search_radius_km / 6378.1, // km / Earth radius km
            ],
          },
        },
      });
    } else if (kind === 'registered' && (profile.latitude == null || profile.longitude == null)) {
      // No geo → return empty.
      return { items: [], pagination: paginate(0, page, limit), location_missing: true };
    }

    if (orClauses.length === 0) {
      return { items: [], pagination: paginate(0, page, limit) };
    }

    const baseQuery: Record<string, unknown> = orClauses.length === 1 ? orClauses[0] : { $or: orClauses };

    if (filters.search) {
      const re = { $regex: filters.search, $options: 'i' };
      baseQuery.$and = [
        { $or: [
          { first_name: re },
          { last_name: re },
          { headline: re },
          { email: re },
        ] },
      ];
    }

    const [items, total] = await Promise.all([
      SeekerProfile.find(baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SeekerProfile.countDocuments(baseQuery),
    ]);

    return { items, pagination: paginate(total, page, limit) };
  },

  async getCandidate(userId: string, candidateId: string) {
    const profile = await getProfileForUser(userId);
    if (!profile) return null;
    if (!mongoose.isValidObjectId(candidateId)) return null;

    const seeker = await SeekerProfile.findById(candidateId).lean();
    if (!seeker) return null;

    // Walk-ins are private to the creating official; registered seekers must not be hidden.
    const isWalkIn = !seeker.user_id;
    const ownedByThisOfficial =
      seeker.created_by_official_id?.toString() === userId;

    if (isWalkIn && !ownedByThisOfficial) return null;
    if (!isWalkIn && seeker.visibility === 'hidden') return null;

    const resumes = await Resume.find({ seeker_id: candidateId })
      .sort({ is_default: -1, uploaded_at: -1 })
      .lean();

    return { seeker, resumes };
  },

  async createWalkIn(
    userId: string,
    input: WalkInInput,
    resumeFile: Express.Multer.File | undefined,
    resumeUrl: string | undefined
  ) {
    if (!resumeFile && !resumeUrl) {
      throw Object.assign(new Error('A resume file is required'), {
        code: 'RESUME_REQUIRED',
        status: 400,
      });
    }

    const seeker = await SeekerProfile.create({
      user_id: undefined,
      email: input.email?.toLowerCase(),
      created_by_official_id: userId,
      first_name: input.first_name,
      last_name: input.last_name,
      phone: input.phone,
      city: input.city,
      state: input.state,
      country: input.country,
      latitude: input.latitude,
      longitude: input.longitude,
      headline: input.headline,
      bio: input.bio,
      visibility: 'companies_only',
      profile_complete_pct: 0,
    });

    const fileUrl = resumeUrl
      ? resumeUrl
      : `/uploads/resumes/${resumeFile!.filename}`;

    let resume;
    try {
      resume = await Resume.create({
        seeker_id: seeker._id,
        original_name: resumeFile?.originalname,
        file_url: fileUrl,
        file_size_kb: resumeFile?.size ? Math.round(resumeFile.size / 1024) : undefined,
        is_default: true,
        label: input.notes ? input.notes.slice(0, 100) : undefined,
      });
    } catch (err) {
      // Roll back the shadow seeker if resume creation fails.
      await SeekerProfile.findByIdAndDelete(seeker._id).catch(() => {});
      throw err;
    }

    return { seeker, resume };
  },

  async push(userId: string, input: PushInput) {
    if (!mongoose.isValidObjectId(input.seeker_id) || !mongoose.isValidObjectId(input.job_id)) {
      throw Object.assign(new Error('Invalid id'), { code: 'BAD_ID', status: 400 });
    }
    const profile = await getProfileForUser(userId);
    if (!profile) throw Object.assign(new Error('Official profile missing'), { code: 'NOT_FOUND', status: 404 });

    const seeker = await SeekerProfile.findById(input.seeker_id).lean();
    if (!seeker) throw Object.assign(new Error('Seeker not found'), { code: 'NOT_FOUND', status: 404 });

    const isWalkIn = !seeker.user_id;
    if (isWalkIn && seeker.created_by_official_id?.toString() !== userId) {
      throw Object.assign(new Error('Cannot push walk-in created by another official'), {
        code: 'FORBIDDEN',
        status: 403,
      });
    }
    if (!isWalkIn && seeker.visibility === 'hidden') {
      throw Object.assign(new Error('Seeker has hidden visibility'), {
        code: 'FORBIDDEN',
        status: 403,
      });
    }

    const job = await Job.findById(input.job_id).lean();
    if (!job) throw Object.assign(new Error('Job not found'), { code: 'NOT_FOUND', status: 404 });
    if (job.status !== 'active') {
      throw Object.assign(new Error('Job is not active'), { code: 'INACTIVE_JOB', status: 400 });
    }

    let resumeId = input.resume_id;
    if (!resumeId) {
      const def = await Resume.findOne({ seeker_id: input.seeker_id, is_default: true })
        .sort({ uploaded_at: -1 })
        .lean();
      if (!def) {
        throw Object.assign(new Error('No resume on file for this candidate'), {
          code: 'NO_RESUME',
          status: 400,
        });
      }
      resumeId = def._id.toString();
    } else {
      const r = await Resume.findById(resumeId).lean();
      if (!r || r.seeker_id.toString() !== input.seeker_id) {
        throw Object.assign(new Error('Resume does not belong to candidate'), {
          code: 'BAD_RESUME',
          status: 400,
        });
      }
    }

    let referral;
    try {
      // Create referral first — its unique index guards against duplicate pushes.
      referral = await Referral.create({
        official_id: userId,
        seeker_id: input.seeker_id,
        job_id: input.job_id,
        resume_id: resumeId,
        candidate_kind: isWalkIn ? 'walk_in' : 'registered',
        push_note: input.push_note,
        status: 'applied',
      });
    } catch (err: any) {
      if (err?.code === 11000) {
        throw Object.assign(new Error('Already pushed this candidate to this job'), {
          code: 'DUPLICATE_PUSH',
          status: 409,
        });
      }
      throw err;
    }

    let application;
    try {
      // Upsert Application (job_id+seeker_id is unique). If already exists, link it.
      const existingApp = await Application.findOne({
        job_id: input.job_id,
        seeker_id: input.seeker_id,
      });

      if (existingApp) {
        if (!existingApp.referred_by) {
          existingApp.referred_by = new mongoose.Types.ObjectId(userId);
          existingApp.referral_id = referral._id;
          await existingApp.save();
        }
        application = existingApp;
      } else {
        application = await Application.create({
          job_id: input.job_id,
          seeker_id: input.seeker_id,
          resume_id: resumeId,
          status: 'applied',
          referred_by: userId,
          referral_id: referral._id,
        });
        // Mark any pending company invite for this (seeker, job) as converted.
        void insightsService.markAppliedFromApplication({
          seekerId: input.seeker_id.toString(),
          jobId: input.job_id.toString(),
          applicationId: application._id.toString(),
        });
      }

      referral.application_id = application._id;
      await referral.save();
    } catch (err) {
      // Roll back the referral we just created if application linking fails.
      await Referral.findByIdAndDelete(referral._id).catch(() => {});
      throw err;
    }

    return { referral, application };
  },

  async listPushes(userId: string, filters: { page?: number; limit?: number }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query = { official_id: userId };
    const [items, total] = await Promise.all([
      Referral.find(query)
        .populate({ path: 'job_id', select: 'title slug company_id', populate: { path: 'company_id', select: 'name logo_url' } })
        .populate('seeker_id', 'first_name last_name email city state country')
        .sort({ pushed_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Referral.countDocuments(query),
    ]);

    // Refresh status from linked Application (Referral.status is a snapshot).
    const appIds = items
      .map((r: any) => r.application_id)
      .filter(Boolean);
    const apps = appIds.length
      ? await Application.find({ _id: { $in: appIds } }).select('_id status').lean()
      : [];
    const appStatus = new Map(apps.map((a: any) => [a._id.toString(), a.status as ApplicationStatus]));

    const enriched = items.map((r: any) => ({
      ...r,
      current_status: r.application_id ? appStatus.get(r.application_id.toString()) ?? r.status : r.status,
    }));

    return { items: enriched, pagination: paginate(total, page, limit) };
  },

  async getNearbyHires(userId: string, filters: { page?: number; limit?: number }) {
    const profile = await getProfileForUser(userId);
    if (!profile) return null;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    if (profile.latitude == null || profile.longitude == null) {
      return { items: [], pagination: paginate(0, page, limit), location_missing: true };
    }

    // Find jobs whose any location is within radius, then filter Applications with status=hired.
    const radiusRad = profile.search_radius_km / 6378.1;
    const jobs = await Job.find({
      'locations.geo': {
        $geoWithin: {
          $centerSphere: [[profile.longitude, profile.latitude], radiusRad],
        },
      },
    }).select('_id').lean();
    const jobIds = jobs.map((j) => j._id);
    if (jobIds.length === 0) {
      return { items: [], pagination: paginate(0, page, limit) };
    }

    const query = { job_id: { $in: jobIds }, status: 'hired' as const };
    const [items, total] = await Promise.all([
      Application.find(query)
        .populate({ path: 'job_id', select: 'title company_id locations', populate: { path: 'company_id', select: 'name logo_url' } })
        .populate('seeker_id', 'first_name last_name city state country')
        .populate('referred_by', 'email')
        .sort({ updated_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments(query),
    ]);

    return { items, pagination: paginate(total, page, limit) };
  },
};

export default officialService;

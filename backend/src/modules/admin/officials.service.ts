import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, EmploymentOfficialProfile } from '../../models/index.js';
import { authService } from '../auth/auth.service.js';
import { emailService } from '../shared/email.service.js';
import type { CreateOfficialInput, UpdateOfficialInput } from './officials.schema.js';

interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  city?: string;
}

export const officialsService = {
  async create(input: CreateOfficialInput, adminId: string) {
    const email = input.email.toLowerCase();

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      throw Object.assign(new Error('A user with this email already exists'), {
        code: 'EMAIL_EXISTS',
        status: 409,
      });
    }

    // Strong random password — official will set their own via the welcome email link.
    const tempPassword = crypto.randomBytes(24).toString('base64url');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    let createdUser = await User.create({
      email,
      password_hash: passwordHash,
      role: 'employment_official',
      is_email_verified: true,
      is_active: true,
      is_banned: false,
      totp_enabled: false,
    });

    let createdProfile;
    try {
      createdProfile = await EmploymentOfficialProfile.create({
        user_id: createdUser._id,
        first_name: input.first_name,
        last_name: input.last_name,
        designation: input.designation,
        phone: input.phone,
        email_alt: input.email_alt,
        employee_code: input.employee_code,
        avatar_url: input.avatar_url,
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country,
        latitude: input.latitude,
        longitude: input.longitude,
        search_radius_km: input.search_radius_km ?? 100,
        created_by_admin_id: adminId,
        is_active: true,
      });
    } catch (err) {
      // Roll back the user we just created if the profile insert fails — best effort.
      await User.findByIdAndDelete(createdUser._id).catch(() => {});
      throw err;
    }

    createdUser.official_profile_id = createdProfile._id;
    await createdUser.save();

    const token = authService.generatePasswordResetToken(createdUser._id.toString());
    void emailService.sendOfficialWelcomeEmail(email, input.first_name, token);

    return { user: createdUser, profile: createdProfile };
  },

  async list(filters: ListFilters) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filters.is_active != null) query.is_active = filters.is_active;
    if (filters.city) query.city = filters.city;
    if (filters.search) {
      query.$or = [
        { first_name: { $regex: filters.search, $options: 'i' } },
        { last_name: { $regex: filters.search, $options: 'i' } },
        { designation: { $regex: filters.search, $options: 'i' } },
        { employee_code: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      EmploymentOfficialProfile.find(query)
        .populate('user_id', 'email is_active last_login_at')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmploymentOfficialProfile.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  },

  async getById(officialId: string) {
    if (!mongoose.isValidObjectId(officialId)) return null;
    return EmploymentOfficialProfile.findById(officialId)
      .populate('user_id', 'email is_active is_banned last_login_at')
      .populate('created_by_admin_id', 'email')
      .lean();
  },

  async update(officialId: string, input: UpdateOfficialInput) {
    if (!mongoose.isValidObjectId(officialId)) return null;
    const profile = await EmploymentOfficialProfile.findById(officialId);
    if (!profile) return null;

    Object.assign(profile, input);
    await profile.save();
    return profile.toObject();
  },

  async setActive(officialId: string, active: boolean) {
    if (!mongoose.isValidObjectId(officialId)) return null;
    const profile = await EmploymentOfficialProfile.findByIdAndUpdate(
      officialId,
      { is_active: active },
      { new: true }
    );
    if (!profile) return null;
    await User.findByIdAndUpdate(profile.user_id, { is_active: active });
    return profile.toObject();
  },

  async resendWelcomeEmail(officialId: string) {
    if (!mongoose.isValidObjectId(officialId)) return false;
    const profile = await EmploymentOfficialProfile.findById(officialId).lean();
    if (!profile) return false;
    const user = await User.findById(profile.user_id).lean();
    if (!user) return false;
    const token = authService.generatePasswordResetToken(user._id.toString());
    void emailService.sendOfficialWelcomeEmail(user.email, profile.first_name, token);
    return true;
  },
};

export default officialsService;

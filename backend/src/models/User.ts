import mongoose, { Document, Schema } from 'mongoose';

export type UserRole =
  | 'job_seeker'
  | 'company_owner'
  | 'hr_manager'
  | 'recruiter'
  | 'viewer'
  | 'super_admin'
  | 'moderator'
  | 'support_admin'
  | 'analytics_admin'
  | 'employment_official';

export interface IUser extends Document {
  email: string;
  password_hash: string;
  role: UserRole;
  // Admin users only — link to a Role record (system or custom).
  admin_role_id?: mongoose.Types.ObjectId;
  // Extra permissions granted on top of admin_role_id. Format `<resource>:<action>`.
  extra_permissions?: string[];
  // Identity fields — primarily used for admin profiles. Seekers and
  // employment officials still source first/last name from their respective
  // profile docs, so these are optional for everyone.
  first_name?: string;
  last_name?: string;
  phone?: string;
  employee_id?: string;
  avatar_url?: string;
  seeker_profile_id?: mongoose.Types.ObjectId;
  company_id?: mongoose.Types.ObjectId;
  branch_id?: mongoose.Types.ObjectId;
  official_profile_id?: mongoose.Types.ObjectId;
  is_email_verified: boolean;
  email_verify_token?: string;
  email_verify_expiry?: Date;
  is_active: boolean;
  is_banned: boolean;
  ban_reason?: string;
  totp_secret?: string;
  totp_enabled: boolean;
  last_login_at?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      maxlength: 255,
      lowercase: true,
      index: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: [
        'job_seeker',
        'company_owner',
        'hr_manager',
        'recruiter',
        'viewer',
        'super_admin',
        'moderator',
        'support_admin',
        'analytics_admin',
        'employment_official',
      ],
      required: true,
    },
    admin_role_id: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      index: true,
    },
    extra_permissions: {
      type: [String],
      default: undefined,
    },
    first_name: { type: String, maxlength: 100 },
    last_name: { type: String, maxlength: 100 },
    phone: { type: String, maxlength: 30 },
    employee_id: { type: String, maxlength: 50, index: true, sparse: true },
    avatar_url: { type: String },
    seeker_profile_id: {
      type: Schema.Types.ObjectId,
      ref: 'SeekerProfile',
    },
    company_id: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
    },
    branch_id: {
      type: Schema.Types.ObjectId,
      ref: 'CompanyBranch',
    },
    official_profile_id: {
      type: Schema.Types.ObjectId,
      ref: 'EmploymentOfficialProfile',
    },
    is_email_verified: {
      type: Boolean,
      default: false,
    },
    email_verify_token: {
      type: String,
    },
    email_verify_expiry: {
      type: Date,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_banned: {
      type: Boolean,
      default: false,
    },
    ban_reason: {
      type: String,
    },
    totp_secret: {
      type: String,
    },
    totp_enabled: {
      type: Boolean,
      default: false,
    },
    last_login_at: {
      type: Date,
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);

export default User;

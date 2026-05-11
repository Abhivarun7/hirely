import mongoose, { Document, Schema } from 'mongoose';

export type Visibility = 'public' | 'companies_only' | 'hidden';
type SeekerWorkMode = 'onsite' | 'remote' | 'hybrid';
type SeekerJobType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance';

export interface ISeekerProfile extends Document {
  user_id?: mongoose.Types.ObjectId;
  email?: string;
  created_by_official_id?: mongoose.Types.ObjectId;
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: Date;
  city?: string;
  state?: string;
  country?: string;
  headline?: string;
  bio?: string;
  avatar_url?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  visibility: Visibility;
  profile_complete_pct: number;

  // Geo for nearby/recommendations
  latitude?: number;
  longitude?: number;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };

  // Job preferences (used by recommendation scorer; all optional)
  expected_salary_min?: number;
  expected_salary_max?: number;
  expected_salary_currency?: string;
  preferred_work_mode?: SeekerWorkMode;
  preferred_job_types?: SeekerJobType[];

  // Bounded list of recently dismissed jobs (capped at 50, 30-day expiry semantics
  // are enforced at read time inside the recommendation pipeline).
  last_dismissed_jobs?: { job_id: mongoose.Types.ObjectId; dismissed_at: Date }[];

  createdAt: Date;
  updatedAt: Date;
}

const SeekerProfileSchema = new Schema<ISeekerProfile>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true,
      index: true,
    },
    email: {
      type: String,
      maxlength: 255,
      lowercase: true,
    },
    created_by_official_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    first_name: { type: String, maxlength: 100 },
    last_name: { type: String, maxlength: 100 },
    phone: { type: String, maxlength: 20 },
    date_of_birth: { type: Date },
    city: { type: String, maxlength: 100 },
    state: { type: String, maxlength: 100 },
    country: { type: String, maxlength: 100 },
    headline: { type: String, maxlength: 255 },
    bio: { type: String },
    avatar_url: { type: String },
    linkedin_url: { type: String },
    github_url: { type: String },
    portfolio_url: { type: String },
    visibility: {
      type: String,
      enum: ['public', 'companies_only', 'hidden'],
      default: 'companies_only',
    },
    profile_complete_pct: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
    },

    expected_salary_min: { type: Number, min: 0 },
    expected_salary_max: { type: Number, min: 0 },
    expected_salary_currency: { type: String, maxlength: 3 },
    preferred_work_mode: {
      type: String,
      enum: ['onsite', 'remote', 'hybrid'],
    },
    preferred_job_types: {
      type: [String],
      enum: ['full_time', 'part_time', 'contract', 'internship', 'freelance'],
      default: undefined,
    },

    last_dismissed_jobs: {
      type: [
        {
          job_id: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
          dismissed_at: { type: Date, default: Date.now },
        },
      ],
      default: undefined,
    },
  },
  { timestamps: true }
);

// 2dsphere on optional location — sparse so seekers without coords don't hit it
SeekerProfileSchema.index({ location: '2dsphere' }, { sparse: true });

// Sync GeoJSON Point from latitude/longitude when either is set
SeekerProfileSchema.pre('validate', function (next) {
  if (this.latitude != null && this.longitude != null) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude],
    };
  }
  next();
});

export const SeekerProfile = mongoose.model<ISeekerProfile>('SeekerProfile', SeekerProfileSchema);

export default SeekerProfile;

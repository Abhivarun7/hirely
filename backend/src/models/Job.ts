import mongoose, { Document, Schema } from 'mongoose';

export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
export type JobType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance';
export type WorkMode = 'onsite' | 'remote' | 'hybrid';
export type JobStatus = 'draft' | 'active' | 'closed' | 'removed';

export interface IJobLocation {
  branch_id?: mongoose.Types.ObjectId;
  label: string;
  latitude: number;
  longitude: number;
  city: string;
  state?: string;
  country: string;
  address?: string;
  google_place_id?: string;
  openings: number;
  is_primary: boolean;
}

export interface IJob extends Document {
  company_id: mongoose.Types.ObjectId;
  category_id?: mongoose.Types.ObjectId;
  posted_by: mongoose.Types.ObjectId;
  job_ref: string;
  title: string;
  slug: string;
  description: string;
  responsibilities?: string;
  requirements?: string;
  experience_level?: ExperienceLevel;
  experience_min_years?: number;
  experience_max_years?: number;
  job_type?: JobType;
  work_mode?: WorkMode;
  salary_min?: number;
  salary_max?: number;
  salary_currency: string;
  salary_disclosed: boolean;
  openings: number;
  locations: IJobLocation[];
  application_deadline?: Date;
  status: JobStatus;
  views_count: number;
  createdAt: Date;
  updatedAt: Date;
}

const JobLocationSchema = new Schema<IJobLocation>(
  {
    branch_id: {
      type: Schema.Types.ObjectId,
      ref: 'CompanyBranch',
      default: null,
    },
    label: {
      type: String,
      required: true,
      maxlength: 255,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    city: {
      type: String,
      required: true,
      maxlength: 100,
    },
    state: {
      type: String,
      maxlength: 100,
    },
    country: {
      type: String,
      required: true,
      maxlength: 100,
    },
    address: {
      type: String,
    },
    google_place_id: {
      type: String,
    },
    openings: {
      type: Number,
      default: 1,
      min: 0,
    },
    is_primary: {
      type: Boolean,
      default: false,
    },
    geo: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
  },
  { _id: false }
);

const JobSchema = new Schema<IJob>(
  {
    company_id: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    category_id: {
      type: Schema.Types.ObjectId,
      ref: 'JobCategory',
      index: true,
    },
    posted_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    job_ref: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      maxlength: 30,
    },
    title: {
      type: String,
      required: true,
      maxlength: 255,
    },
    slug: {
      type: String,
      maxlength: 255,
    },
    description: {
      type: String,
      required: true,
    },
    responsibilities: {
      type: String,
    },
    requirements: {
      type: String,
    },
    experience_level: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
    },
    experience_min_years: { type: Number, min: 0 },
    experience_max_years: { type: Number, min: 0 },
    job_type: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'internship', 'freelance'],
    },
    work_mode: {
      type: String,
      enum: ['onsite', 'remote', 'hybrid'],
    },
    salary_min: {
      type: Number,
    },
    salary_max: {
      type: Number,
    },
    salary_currency: {
      type: String,
      default: 'INR',
      maxlength: 3,
    },
    salary_disclosed: {
      type: Boolean,
      default: true,
    },
    openings: {
      type: Number,
      default: 1,
    },
    locations: {
      type: [JobLocationSchema],
      validate: [
        (a: IJobLocation[]) => a.length >= 1,
        'At least one location is required',
      ],
    },
    application_deadline: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'closed', 'removed'],
      default: 'draft',
      index: true,
    },
    views_count: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Text search index
JobSchema.index({ title: 'text', description: 'text', responsibilities: 'text', requirements: 'text' });

// Compound indexes for common queries
JobSchema.index({ status: 1, createdAt: -1 });
JobSchema.index({ 'locations.branch_id': 1 });
JobSchema.index({ 'locations.city': 1 });
JobSchema.index({ 'locations.geo': '2dsphere' });

// Pre-save hook to sync geo from lat/lng and calculate openings
JobSchema.pre('save', function (next) {
  if (this.locations && this.locations.length) {
    this.locations.forEach((loc) => {
      loc.geo = {
        type: 'Point',
        coordinates: [loc.longitude, loc.latitude],
      };
    });

    // Calculate total openings from locations if not explicitly set
    if (!this.isModified('openings')) {
      this.openings =
        this.locations.reduce((sum, l) => sum + (l.openings || 0), 0) || 1;
    }
  }
  next();
});

export const Job = mongoose.model<IJob>('Job', JobSchema);

export default Job;

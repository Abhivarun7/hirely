import mongoose, { Document, Schema } from 'mongoose';

export type ApplicationStatus =
  | 'applied'
  | 'reviewed'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'offer_extended'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export type ScreeningRecommendation =
  | 'strong_match'
  | 'possible_match'
  | 'weak_match'
  | 'not_a_match';

export interface IAIScreening {
  score: number;
  recommendation: ScreeningRecommendation;
  summary: string;
  strengths: string[];
  gaps: string[];
  screened_at: Date;
  screened_by?: mongoose.Types.ObjectId;
}

export interface IApplication extends Document {
  job_id: mongoose.Types.ObjectId;
  seeker_id: mongoose.Types.ObjectId;
  resume_id: mongoose.Types.ObjectId;
  cover_letter_text?: string;
  cover_letter_file?: string;
  status: ApplicationStatus;
  ai_screening?: IAIScreening;
  referred_by?: mongoose.Types.ObjectId;
  referral_id?: mongoose.Types.ObjectId;
  applied_at: Date;
  updated_at: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    job_id: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    seeker_id: {
      type: Schema.Types.ObjectId,
      ref: 'SeekerProfile',
      required: true,
      index: true,
    },
    resume_id: {
      type: Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
    },
    cover_letter_text: {
      type: String,
    },
    cover_letter_file: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        'applied',
        'reviewed',
        'shortlisted',
        'interview_scheduled',
        'offer_extended',
        'hired',
        'rejected',
        'withdrawn',
      ],
      default: 'applied',
      index: true,
    },
    ai_screening: {
      score: { type: Number, min: 0, max: 100 },
      recommendation: {
        type: String,
        enum: ['strong_match', 'possible_match', 'weak_match', 'not_a_match'],
      },
      summary: { type: String },
      strengths: [{ type: String }],
      gaps: [{ type: String }],
      screened_at: { type: Date },
      screened_by: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    referred_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    referral_id: {
      type: Schema.Types.ObjectId,
      ref: 'Referral',
    },
    applied_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: { createdAt: false, updatedAt: 'updated_at' } }
);

// Unique compound index on job_id + seeker_id
ApplicationSchema.index({ job_id: 1, seeker_id: 1 }, { unique: true });

export const Application = mongoose.model<IApplication>('Application', ApplicationSchema);

export default Application;

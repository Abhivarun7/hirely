import mongoose, { Document, Schema } from 'mongoose';
import type { ApplicationStatus } from './Application.js';

export interface IReferral extends Document {
  official_id: mongoose.Types.ObjectId;
  seeker_id: mongoose.Types.ObjectId;
  job_id: mongoose.Types.ObjectId;
  application_id?: mongoose.Types.ObjectId;
  resume_id: mongoose.Types.ObjectId;
  candidate_kind: 'registered' | 'walk_in';
  push_note?: string;
  status: ApplicationStatus;
  pushed_at: Date;
  updated_at: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    official_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    seeker_id: {
      type: Schema.Types.ObjectId,
      ref: 'SeekerProfile',
      required: true,
      index: true,
    },
    job_id: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    application_id: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
    },
    resume_id: {
      type: Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
    },
    candidate_kind: {
      type: String,
      enum: ['registered', 'walk_in'],
      required: true,
    },
    push_note: {
      type: String,
      maxlength: 2000,
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
    pushed_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: { createdAt: false, updatedAt: 'updated_at' } }
);

ReferralSchema.index({ official_id: 1, job_id: 1, seeker_id: 1 }, { unique: true });
ReferralSchema.index({ official_id: 1, pushed_at: -1 });

export const Referral = mongoose.model<IReferral>('Referral', ReferralSchema);

export default Referral;

import mongoose, { Document, Schema } from 'mongoose';

export type ApplicationStatusForHistory =
  | 'applied'
  | 'reviewed'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'offer_extended'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export type ActorRole = 'job_seeker' | 'company_owner' | 'hr_manager' | 'recruiter' | 'admin';

export interface IApplicationStatusHistory extends Document {
  application_id: mongoose.Types.ObjectId;
  old_status?: ApplicationStatusForHistory;
  new_status: ApplicationStatusForHistory;
  changed_by: mongoose.Types.ObjectId;
  changed_by_role: ActorRole;
  note?: string;
  changed_at: Date;
}

const ApplicationStatusHistorySchema = new Schema<IApplicationStatusHistory>(
  {
    application_id: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    old_status: {
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
    },
    new_status: {
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
      required: true,
    },
    changed_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changed_by_role: {
      type: String,
      enum: ['job_seeker', 'company_owner', 'hr_manager', 'recruiter', 'admin'],
      required: true,
    },
    note: {
      type: String,
    },
    changed_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

export const ApplicationStatusHistory = mongoose.model<IApplicationStatusHistory>(
  'ApplicationStatusHistory',
  ApplicationStatusHistorySchema
);

export default ApplicationStatusHistory;

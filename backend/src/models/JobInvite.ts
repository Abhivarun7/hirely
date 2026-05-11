import mongoose, { Document, Schema } from 'mongoose';

export type JobInviteStatus = 'sent' | 'opened' | 'clicked' | 'applied';

export interface IJobInvite extends Document {
  company_id: mongoose.Types.ObjectId;
  inviter_user_id: mongoose.Types.ObjectId;
  seeker_id: mongoose.Types.ObjectId;
  seeker_user_id: mongoose.Types.ObjectId;
  job_id: mongoose.Types.ObjectId;
  job_title_snapshot: string;
  seeker_email_snapshot: string;
  inviter_email_snapshot?: string;
  message?: string;
  match_score?: number;
  token: string;
  status: JobInviteStatus;
  sent_at: Date;
  opened_at?: Date;
  clicked_at?: Date;
  applied_at?: Date;
  application_id?: mongoose.Types.ObjectId;
  open_count: number;
  click_count: number;
  createdAt: Date;
  updatedAt: Date;
}

const JobInviteSchema = new Schema<IJobInvite>(
  {
    company_id: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    inviter_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seeker_id: { type: Schema.Types.ObjectId, ref: 'SeekerProfile', required: true, index: true },
    seeker_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    job_id: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    // Snapshots so the row stays meaningful even if the job is later renamed
    // or the seeker's email changes.
    job_title_snapshot: { type: String, required: true, maxlength: 255 },
    seeker_email_snapshot: { type: String, required: true, maxlength: 320 },
    inviter_email_snapshot: { type: String, maxlength: 320 },
    message: { type: String, maxlength: 2000 },
    match_score: { type: Number, min: 0, max: 100 },
    token: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['sent', 'opened', 'clicked', 'applied'],
      default: 'sent',
      index: true,
    },
    sent_at: { type: Date, default: Date.now, required: true },
    opened_at: { type: Date },
    clicked_at: { type: Date },
    applied_at: { type: Date },
    application_id: { type: Schema.Types.ObjectId, ref: 'Application' },
    open_count: { type: Number, default: 0 },
    click_count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Used by the AI Insights inline badge: "find the latest invite for this
// (company, job, seeker) tuple" is the hot path.
JobInviteSchema.index({ company_id: 1, job_id: 1, seeker_id: 1, sent_at: -1 });

export const JobInvite = mongoose.model<IJobInvite>('JobInvite', JobInviteSchema);

export default JobInvite;

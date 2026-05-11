import mongoose, { Document, Schema } from 'mongoose';

export type JobViewerType = 'seeker' | 'anon' | 'company_user';
export type JobViewSource = 'public' | 'seeker' | 'company';

export interface IJobView extends Document {
  job_id: mongoose.Types.ObjectId;
  company_id: mongoose.Types.ObjectId;
  viewer_key: string;
  viewer_type: JobViewerType;
  source: JobViewSource;
  ts: Date;
}

const JobViewSchema = new Schema<IJobView>(
  {
    job_id: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    company_id: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    viewer_key: {
      type: String,
      required: true,
      maxlength: 128,
    },
    viewer_type: {
      type: String,
      enum: ['seeker', 'anon', 'company_user'],
      required: true,
    },
    source: {
      type: String,
      enum: ['public', 'seeker', 'company'],
      required: true,
    },
    ts: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// Dedupe lookup: latest event for (job, viewer)
JobViewSchema.index({ job_id: 1, viewer_key: 1, ts: -1 });

// Dashboard time-bounded queries by company
JobViewSchema.index({ company_id: 1, ts: -1 });

// Garbage-collect events older than 365 days so the collection stays bounded.
// MongoDB's TTL monitor sweeps these on its own schedule.
JobViewSchema.index({ ts: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const JobView = mongoose.model<IJobView>('JobView', JobViewSchema);

export default JobView;

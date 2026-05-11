import mongoose, { Document, Schema } from 'mongoose';

export interface ISavedJob extends Document {
  seeker_id: mongoose.Types.ObjectId;
  job_id: mongoose.Types.ObjectId;
  saved_at: Date;
}

const SavedJobSchema = new Schema<ISavedJob>(
  {
    seeker_id: {
      type: Schema.Types.ObjectId,
      ref: 'SeekerProfile',
      required: true,
    },
    job_id: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    saved_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// Unique compound index on seeker_id + job_id
SavedJobSchema.index({ seeker_id: 1, job_id: 1 }, { unique: true });

export const SavedJob = mongoose.model<ISavedJob>('SavedJob', SavedJobSchema);

export default SavedJob;

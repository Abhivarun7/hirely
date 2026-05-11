import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkExperience extends Document {
  seeker_id: mongoose.Types.ObjectId;
  company_name?: string;
  job_title?: string;
  location?: string;
  start_date?: Date;
  end_date?: Date;
  is_current: boolean;
  description?: string;
  created_at: Date;
}

const WorkExperienceSchema = new Schema<IWorkExperience>(
  {
    seeker_id: {
      type: Schema.Types.ObjectId,
      ref: 'SeekerProfile',
      required: true,
      index: true,
    },
    company_name: {
      type: String,
      maxlength: 255,
    },
    job_title: {
      type: String,
      maxlength: 255,
    },
    location: {
      type: String,
      maxlength: 255,
    },
    start_date: {
      type: Date,
    },
    end_date: {
      type: Date,
    },
    is_current: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const WorkExperience = mongoose.model<IWorkExperience>('WorkExperience', WorkExperienceSchema);

export default WorkExperience;

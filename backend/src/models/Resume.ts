import mongoose, { Document, Schema } from 'mongoose';

export interface IResume extends Document {
  seeker_id: mongoose.Types.ObjectId;
  label?: string;
  original_name?: string;
  file_url: string;
  file_size_kb?: number;
  is_default: boolean;
  uploaded_at: Date;
}

const ResumeSchema = new Schema<IResume>(
  {
    seeker_id: {
      type: Schema.Types.ObjectId,
      ref: 'SeekerProfile',
      required: true,
      index: true,
    },
    label: {
      type: String,
      maxlength: 100,
    },
    original_name: {
      type: String,
      maxlength: 255,
    },
    file_url: {
      type: String,
      required: true,
    },
    file_size_kb: {
      type: Number,
    },
    is_default: {
      type: Boolean,
      default: false,
    },
    uploaded_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

export const Resume = mongoose.model<IResume>('Resume', ResumeSchema);

export default Resume;

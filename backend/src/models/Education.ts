import mongoose, { Document, Schema } from 'mongoose';

export interface IEducation extends Document {
  seeker_id: mongoose.Types.ObjectId;
  institution?: string;
  degree?: string;
  field_of_study?: string;
  start_date?: Date;
  end_date?: Date;
  is_current: boolean;
  gpa?: number;
  description?: string;
  created_at: Date;
}

const EducationSchema = new Schema<IEducation>(
  {
    seeker_id: {
      type: Schema.Types.ObjectId,
      ref: 'SeekerProfile',
      required: true,
      index: true,
    },
    institution: {
      type: String,
      maxlength: 255,
    },
    degree: {
      type: String,
      maxlength: 100,
    },
    field_of_study: {
      type: String,
      maxlength: 100,
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
    gpa: {
      type: Number,
      min: 0,
      max: 10,
    },
    description: {
      type: String,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const Education = mongoose.model<IEducation>('Education', EducationSchema);

export default Education;

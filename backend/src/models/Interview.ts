import mongoose, { Document, Schema } from 'mongoose';

export type InterviewFormat = 'video' | 'phone' | 'in_person';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface IInterview extends Document {
  application_id: mongoose.Types.ObjectId;
  scheduled_by: mongoose.Types.ObjectId;
  interview_date: Date;
  format: InterviewFormat;
  location_or_link?: string;
  notes?: string;
  status: InterviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema = new Schema<IInterview>(
  {
    application_id: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    scheduled_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    interview_date: {
      type: Date,
      required: true,
    },
    format: {
      type: String,
      enum: ['video', 'phone', 'in_person'],
      required: true,
    },
    location_or_link: {
      type: String,
    },
    notes: {
      type: String,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled',
    },
  },
  { timestamps: true }
);

export const Interview = mongoose.model<IInterview>('Interview', InterviewSchema);

export default Interview;

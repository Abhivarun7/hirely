import mongoose, { Document, Schema } from 'mongoose';

export interface IJobCategory extends Document {
  name: string;
  slug: string;
  icon_url?: string;
  is_active: boolean;
  created_at: Date;
}

const JobCategorySchema = new Schema<IJobCategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      unique: true,
      maxlength: 100,
    },
    icon_url: {
      type: String,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const JobCategory = mongoose.model<IJobCategory>('JobCategory', JobCategorySchema);

export default JobCategory;

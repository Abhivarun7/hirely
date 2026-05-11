import mongoose, { Document, Schema } from 'mongoose';

export interface ISkillTag extends Document {
  name: string;
  slug: string;
  category?: string;
  is_active: boolean;
  created_at: Date;
}

const SkillTagSchema = new Schema<ISkillTag>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      maxlength: 100,
    },
    category: {
      type: String,
      maxlength: 100,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const SkillTag = mongoose.model<ISkillTag>('SkillTag', SkillTagSchema);

export default SkillTag;

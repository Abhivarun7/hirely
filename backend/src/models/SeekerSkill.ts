import mongoose, { Document, Schema } from 'mongoose';

export type Proficiency = 'beginner' | 'intermediate' | 'expert';

export interface ISeekerSkill extends Document {
  seeker_id: mongoose.Types.ObjectId;
  skill_tag_id: mongoose.Types.ObjectId;
  proficiency: Proficiency;
  created_at: Date;
}

const SeekerSkillSchema = new Schema<ISeekerSkill>(
  {
    seeker_id: {
      type: Schema.Types.ObjectId,
      ref: 'SeekerProfile',
      required: true,
      index: true,
    },
    skill_tag_id: {
      type: Schema.Types.ObjectId,
      ref: 'SkillTag',
      required: true,
    },
    proficiency: {
      type: String,
      enum: ['beginner', 'intermediate', 'expert'],
      required: true,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// Unique compound index on seeker_id + skill_tag_id
SeekerSkillSchema.index({ seeker_id: 1, skill_tag_id: 1 }, { unique: true });

export const SeekerSkill = mongoose.model<ISeekerSkill>('SeekerSkill', SeekerSkillSchema);

export default SeekerSkill;

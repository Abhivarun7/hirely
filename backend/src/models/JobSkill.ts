import mongoose, { Document, Schema } from 'mongoose';

export interface IJobSkill extends Document {
  job_id: mongoose.Types.ObjectId;
  skill_tag_id: mongoose.Types.ObjectId;
  is_required: boolean;
}

const JobSkillSchema = new Schema<IJobSkill>(
  {
    job_id: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    skill_tag_id: {
      type: Schema.Types.ObjectId,
      ref: 'SkillTag',
      required: true,
    },
    is_required: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: false }
);

// Unique compound index on job_id + skill_tag_id
JobSkillSchema.index({ job_id: 1, skill_tag_id: 1 }, { unique: true });

export const JobSkill = mongoose.model<IJobSkill>('JobSkill', JobSkillSchema);

export default JobSkill;

import mongoose, { Document, Schema } from 'mongoose';

export type HomeFeedEventType = 'view' | 'click' | 'apply' | 'dismiss' | 'save';
export type HomeFeedSource = 'reco' | 'nearby';

export interface IHomeFeedEvent extends Document {
  seeker_id: mongoose.Types.ObjectId;
  type: HomeFeedEventType;
  source: HomeFeedSource;
  job_id?: mongoose.Types.ObjectId;
  company_id?: mongoose.Types.ObjectId;
  score?: number;
  position?: number;
  ts: Date;
}

const HomeFeedEventSchema = new Schema<IHomeFeedEvent>(
  {
    seeker_id: {
      type: Schema.Types.ObjectId,
      ref: 'SeekerProfile',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['view', 'click', 'apply', 'dismiss', 'save'],
      required: true,
    },
    source: {
      type: String,
      enum: ['reco', 'nearby'],
      required: true,
    },
    job_id: { type: Schema.Types.ObjectId, ref: 'Job' },
    company_id: { type: Schema.Types.ObjectId, ref: 'Company' },
    score: { type: Number, min: 0, max: 100 },
    position: { type: Number, min: 0 },
    ts: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

HomeFeedEventSchema.index({ seeker_id: 1, ts: -1 });
HomeFeedEventSchema.index({ source: 1, type: 1, ts: -1 });

export const HomeFeedEvent = mongoose.model<IHomeFeedEvent>('HomeFeedEvent', HomeFeedEventSchema);

export default HomeFeedEvent;

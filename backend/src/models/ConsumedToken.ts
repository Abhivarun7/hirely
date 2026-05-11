import mongoose, { Document, Schema } from 'mongoose';

export interface IConsumedToken extends Document {
  jti: string;
  action: string;
  expires_at: Date;
  created_at: Date;
}

const ConsumedTokenSchema = new Schema<IConsumedToken>(
  {
    jti: { type: String, required: true, unique: true, index: true },
    action: { type: String, required: true },
    expires_at: { type: Date, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

ConsumedTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const ConsumedToken = mongoose.model<IConsumedToken>(
  'ConsumedToken',
  ConsumedTokenSchema
);

export default ConsumedToken;

import mongoose, { Document, Schema } from 'mongoose';

export interface ICertification extends Document {
  seeker_id: mongoose.Types.ObjectId;
  name?: string;
  issuer?: string;
  issue_date?: Date;
  expiry_date?: Date;
  credential_url?: string;
  created_at: Date;
}

const CertificationSchema = new Schema<ICertification>(
  {
    seeker_id: {
      type: Schema.Types.ObjectId,
      ref: 'SeekerProfile',
      required: true,
      index: true,
    },
    name: {
      type: String,
      maxlength: 255,
    },
    issuer: {
      type: String,
      maxlength: 255,
    },
    issue_date: {
      type: Date,
    },
    expiry_date: {
      type: Date,
    },
    credential_url: {
      type: String,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const Certification = mongoose.model<ICertification>('Certification', CertificationSchema);

export default Certification;

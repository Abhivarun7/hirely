import mongoose, { Document, Schema } from 'mongoose';

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'banned';

export interface ICompany extends Document {
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  industry?: string;
  company_size?: CompanySize;
  founding_year?: number;
  website_url?: string;
  linkedin_url?: string;
  registration_docs: string[];
  approval_status: ApprovalStatus;
  rejection_reason?: string;
  approved_by?: mongoose.Types.ObjectId;
  approved_at?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: true,
      maxlength: 255,
    },
    slug: {
      type: String,
      unique: true,
      maxlength: 255,
      index: true,
    },
    logo_url: {
      type: String,
    },
    description: {
      type: String,
    },
    industry: {
      type: String,
      maxlength: 100,
    },
    company_size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
    },
    founding_year: {
      type: Number,
    },
    website_url: {
      type: String,
    },
    linkedin_url: {
      type: String,
    },
    registration_docs: {
      type: [String],
      default: [],
    },
    approval_status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended', 'banned'],
      default: 'pending',
      index: true,
    },
    rejection_reason: {
      type: String,
    },
    approved_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approved_at: {
      type: Date,
    },
  },
  { timestamps: true }
);

export const Company = mongoose.model<ICompany>('Company', CompanySchema);

export default Company;

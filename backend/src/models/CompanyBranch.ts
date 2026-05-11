import mongoose, { Document, Schema } from 'mongoose';

export interface ICompanyBranch extends Document {
  company_id: mongoose.Types.ObjectId;
  name: string;
  city: string;
  state?: string;
  country: string;
  address: string;
  phone?: string;
  email?: string;
  latitude: number;
  longitude: number;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  google_place_id?: string;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyBranchSchema = new Schema<ICompanyBranch>(
  {
    company_id: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 255,
    },
    city: {
      type: String,
      required: true,
      maxlength: 100,
    },
    state: {
      type: String,
      maxlength: 100,
    },
    country: {
      type: String,
      required: true,
      maxlength: 100,
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      maxlength: 20,
    },
    email: {
      type: String,
      maxlength: 255,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    google_place_id: {
      type: String,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// 2dsphere index for geo queries
CompanyBranchSchema.index({ location: '2dsphere' });

// Runs before validation so location.coordinates is populated before required-check
CompanyBranchSchema.pre('validate', function (next) {
  if (this.latitude != null && this.longitude != null) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude],
    };
  }
  next();
});

export const CompanyBranch = mongoose.model<ICompanyBranch>('CompanyBranch', CompanyBranchSchema);

export default CompanyBranch;

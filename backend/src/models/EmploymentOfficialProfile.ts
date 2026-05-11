import mongoose, { Document, Schema } from 'mongoose';

export interface IEmploymentOfficialProfile extends Document {
  user_id: mongoose.Types.ObjectId;
  first_name: string;
  last_name: string;
  phone?: string;
  email_alt?: string;
  designation: string;
  employee_code?: string;
  avatar_url?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;

  latitude?: number;
  longitude?: number;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };

  search_radius_km: number;

  created_by_admin_id: mongoose.Types.ObjectId;
  is_active: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const EmploymentOfficialProfileSchema = new Schema<IEmploymentOfficialProfile>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    first_name: { type: String, required: true, maxlength: 100 },
    last_name: { type: String, required: true, maxlength: 100 },
    phone: { type: String, maxlength: 20 },
    email_alt: { type: String, maxlength: 255, lowercase: true },
    designation: { type: String, required: true, maxlength: 150 },
    employee_code: { type: String, maxlength: 50 },
    avatar_url: { type: String },
    address: { type: String },
    city: { type: String, maxlength: 100 },
    state: { type: String, maxlength: 100 },
    country: { type: String, maxlength: 100 },

    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
    },

    search_radius_km: {
      type: Number,
      required: true,
      default: 100,
      min: 1,
      max: 1000,
    },

    created_by_admin_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

EmploymentOfficialProfileSchema.index({ location: '2dsphere' }, { sparse: true });
EmploymentOfficialProfileSchema.index({ city: 1 });

EmploymentOfficialProfileSchema.pre('validate', function (next) {
  if (this.latitude != null && this.longitude != null) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude],
    };
  }
  next();
});

export const EmploymentOfficialProfile = mongoose.model<IEmploymentOfficialProfile>(
  'EmploymentOfficialProfile',
  EmploymentOfficialProfileSchema
);

export default EmploymentOfficialProfile;

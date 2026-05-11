import mongoose, { Document, Schema } from 'mongoose';

export interface ITicketTemplate extends Document {
  name: string;
  content: string;
  is_active: boolean;
  created_by?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TicketTemplateSchema = new Schema<ITicketTemplate>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100, unique: true },
    content: { type: String, required: true, maxlength: 5000 },
    is_active: { type: Boolean, default: true, index: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const TicketTemplate = mongoose.model<ITicketTemplate>('TicketTemplate', TicketTemplateSchema);

export default TicketTemplate;

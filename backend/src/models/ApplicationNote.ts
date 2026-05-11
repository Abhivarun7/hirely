import mongoose, { Document, Schema } from 'mongoose';

export interface IApplicationNote extends Document {
  application_id: mongoose.Types.ObjectId;
  author_id: mongoose.Types.ObjectId;
  note: string;
  created_at: Date;
}

const ApplicationNoteSchema = new Schema<IApplicationNote>(
  {
    application_id: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    author_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    note: {
      type: String,
      required: true,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const ApplicationNote = mongoose.model<IApplicationNote>('ApplicationNote', ApplicationNoteSchema);

export default ApplicationNote;

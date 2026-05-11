import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  user_id: mongoose.Types.ObjectId;
  type?: string;
  title: string;
  body?: string;
  link?: string;
  is_read: boolean;
  created_at: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      maxlength: 100,
    },
    title: {
      type: String,
      required: true,
      maxlength: 255,
    },
    body: {
      type: String,
    },
    link: {
      type: String,
    },
    is_read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;

import mongoose, { Document, Schema } from 'mongoose';

export interface ITicketAttachment {
  url: string;
  filename: string;
  mime: string;
  size: number;
}

export interface ITicketMessage extends Document {
  ticket_id: mongoose.Types.ObjectId;
  sender_id: mongoose.Types.ObjectId;
  message?: string;
  attachments?: ITicketAttachment[];
  sent_at: Date;
}

const TicketAttachmentSchema = new Schema<ITicketAttachment>(
  {
    url: { type: String, required: true },
    filename: { type: String, required: true },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const TicketMessageSchema = new Schema<ITicketMessage>(
  {
    ticket_id: {
      type: Schema.Types.ObjectId,
      ref: 'SupportTicket',
      required: true,
      index: true,
    },
    sender_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
    },
    attachments: {
      type: [TicketAttachmentSchema],
      default: undefined,
    },
    sent_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

export const TicketMessage = mongoose.model<ITicketMessage>('TicketMessage', TicketMessageSchema);

export default TicketMessage;

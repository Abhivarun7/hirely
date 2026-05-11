import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  actor_id: mongoose.Types.ObjectId;
  actor_role: string;
  action: string;
  entity_type?: string;
  entity_id?: mongoose.Types.ObjectId;
  old_value?: unknown;
  new_value?: unknown;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actor_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actor_role: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      maxlength: 100,
      index: true,
    },
    entity_type: {
      type: String,
      maxlength: 100,
    },
    entity_id: {
      type: Schema.Types.ObjectId,
    },
    old_value: {
      type: Schema.Types.Mixed,
    },
    new_value: {
      type: Schema.Types.Mixed,
    },
    ip_address: {
      type: String,
      maxlength: 45,
    },
    user_agent: {
      type: String,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// Compound indexes for common queries
AuditLogSchema.index({ created_at: -1 });
AuditLogSchema.index({ entity_type: 1, entity_id: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;

import mongoose, { Schema, models, model } from "mongoose";

export interface AuditLogDoc {
  _id: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<AuditLogDoc>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    reason: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: 1 });

export const AuditLog = models.AuditLog || model<AuditLogDoc>("AuditLog", AuditLogSchema);

export async function writeAudit(entry: {
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}) {
  await AuditLog.create({
    actorId: entry.actorId || undefined,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    before: entry.before,
    after: entry.after,
    reason: entry.reason,
  });
}

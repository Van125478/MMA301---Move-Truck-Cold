import { Schema, model } from "mongoose";
import { userRoles } from "./user.js";

export const auditActions = [
  "SHIPMENT_PUBLISHED",
  "SHIPMENT_CLAIMED",
  "SHIPMENT_ASSIGNED",
  "SHIPMENT_PICKUP_CONFIRMED",
  "SHIPMENT_DELIVERY_CONFIRMED",
  "SHIPMENT_CANCELLED",
  "COMMISSION_ACCRUED",
  "VEHICLE_CREATED",
  "VEHICLE_UPDATED",
  "VEHICLE_ARCHIVED",
  "VEHICLE_RESTORED",
  "DRIVER_PROFILE_UPDATED",
  "DRIVER_ACCOUNT_CREATED",
  "DRIVER_ACCOUNT_LOCKED",
  "DRIVER_ACCOUNT_UNLOCKED",
  "DRIVER_PASSWORD_RESET",
] as const;

export const oneShotAuditActions = [
  "SHIPMENT_PUBLISHED",
  "SHIPMENT_CLAIMED",
  "SHIPMENT_ASSIGNED",
  "SHIPMENT_PICKUP_CONFIRMED",
  "SHIPMENT_DELIVERY_CONFIRMED",
  "SHIPMENT_CANCELLED",
  "COMMISSION_ACCRUED",
] as const;

export type AuditAction = (typeof auditActions)[number];

const auditLogSchema = new Schema(
  {
    action: { type: String, required: true, enum: auditActions },
    actorId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    actorRole: { type: String, required: true, enum: userRoles },
    resourceType: { type: String, required: true, enum: ["shipment", "vehicle", "driver"] },
    resourceId: { type: Schema.Types.ObjectId, required: true },
    outcome: { type: String, required: true, enum: ["success"] },
    occurredAt: { type: Date, required: true },
    statusBefore: { type: String },
    statusAfter: { type: String },
    relatedCarrierId: { type: Schema.Types.ObjectId, ref: "User" },
    correlationId: { type: String, maxlength: 64 },
    fields: { type: [String], default: undefined },
  },
  { versionKey: false },
);

auditLogSchema.index(
  { action: 1, resourceId: 1 },
  { unique: true, partialFilterExpression: { action: { $in: [...oneShotAuditActions] } } },
);

export const AuditLog = model("AuditLog", auditLogSchema);

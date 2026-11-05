import { Schema, model } from "mongoose";

export const freightPaymentStatuses = ["RECORDED", "CONFIRMED"] as const;

export type FreightPaymentStatus = (typeof freightPaymentStatuses)[number];

export const freightPaymentMethods = ["BANK_TRANSFER", "CASH"] as const;

export type FreightPaymentMethod = (typeof freightPaymentMethods)[number];

const freightPaymentSchema = new Schema(
  {
    shipmentId: { type: Schema.Types.ObjectId, ref: "Shipment", required: true },
    shipperId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    carrierId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amountVnd: { type: Number, required: true, min: 1 },
    method: { type: String, required: true, enum: freightPaymentMethods },
    reference: { type: String, trim: true, maxlength: 40 },
    status: { type: String, required: true, enum: freightPaymentStatuses },
    platformCollected: { type: Boolean, required: true, validate: (value: boolean) => value === false },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recordedAt: { type: Date, required: true },
    confirmedBy: { type: Schema.Types.ObjectId, ref: "User" },
    confirmedAt: { type: Date },
  },
  { timestamps: true },
);

freightPaymentSchema.index({ shipmentId: 1 }, { unique: true });

export const FreightPayment = model("FreightPayment", freightPaymentSchema);

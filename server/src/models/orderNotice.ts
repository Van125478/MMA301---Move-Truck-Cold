import { Schema, model } from "mongoose";

export const orderNoticeKinds = ["PUBLISHED", "CLAIMED", "ASSIGNED"] as const;

export type OrderNoticeKind = (typeof orderNoticeKinds)[number];

const orderNoticeSchema = new Schema(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    shipmentId: { type: Schema.Types.ObjectId, ref: "Shipment", required: true },
    kind: { type: String, required: true, enum: orderNoticeKinds },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    body: { type: String, required: true, trim: true, maxlength: 240 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

orderNoticeSchema.index({ recipientId: 1, shipmentId: 1, kind: 1 }, { unique: true });
orderNoticeSchema.index({ recipientId: 1, createdAt: -1, _id: -1 });

export const OrderNotice = model("OrderNotice", orderNoticeSchema);

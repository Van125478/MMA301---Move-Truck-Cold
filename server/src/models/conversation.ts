import { Schema, model } from "mongoose";

const conversationSchema = new Schema(
  {
    shipmentId: { type: Schema.Types.ObjectId, ref: "Shipment", required: true, index: true },
    shipperId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    carrierId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    nextSequence: { type: Number, required: true, default: 0 },
    carrierReadSequence: { type: Number, required: true, default: 0 },
    shipperReadSequence: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

conversationSchema.index({ shipmentId: 1, carrierId: 1 }, { unique: true });

export const Conversation = model("Conversation", conversationSchema);

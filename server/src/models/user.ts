import { Schema, model } from "mongoose";

export const userRoles = ["SHIPPER", "CARRIER", "DRIVER", "ADMIN"] as const;

export type UserRole = (typeof userRoles)[number];

export const accountStatuses = ["ACTIVE", "LOCKED"] as const;

export type AccountStatus = (typeof accountStatuses)[number];

const userSchema = new Schema(
  {
    email: { type: String, lowercase: true, trim: true },
    username: { type: String, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: userRoles },
    carrierId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    displayName: { type: String, trim: true, maxlength: 80 },
    accountStatus: { type: String, enum: accountStatuses, default: "ACTIVE" },
    mustChangePassword: { type: Boolean, default: false },
    sessionVersion: { type: Number, default: 0 },
    passwordResetHash: { type: String },
    passwordResetExpiresAt: { type: Date },
    heldShipmentIds: [{ type: Schema.Types.ObjectId, ref: "Shipment" }],
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ username: 1 }, { unique: true, sparse: true });

export const User = model("User", userSchema);

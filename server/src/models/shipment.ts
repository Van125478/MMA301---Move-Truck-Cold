import { Schema, model } from "mongoose";

export const temperatureGroups = ["COOL", "FROZEN", "DEEP_FROZEN"] as const;

export type TemperatureGroup = (typeof temperatureGroups)[number];

export const temperatureLabels: Record<TemperatureGroup, string> = {
  COOL: "Lạnh mát",
  FROZEN: "Đông",
  DEEP_FROZEN: "Cực lạnh",
};

export const shipmentStatuses = [
  "DRAFT",
  "PUBLISHED",
  "MATCHED",
  "PICKUP_CONFIRMED",
  "IN_TRANSIT",
  "DELIVERY_CONFIRMED",
  "COMPLETED",
  "INCIDENT",
  "CANCELLED",
] as const;

export type ShipmentStatus = (typeof shipmentStatuses)[number];

export const shipmentEventTypes = ["PUBLISHED", "CLAIMED", "ASSIGNED", "PICKUP_CONFIRMED", "DELIVERY_CONFIRMED", "CANCELLED"] as const;

export type ShipmentEventType = (typeof shipmentEventTypes)[number];

const shipmentEventSchema = new Schema(
  {
    type: { type: String, required: true, enum: shipmentEventTypes },
    occurredAt: { type: Date, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorRole: { type: String, required: true, enum: ["SHIPPER", "CARRIER", "DRIVER"] },
    statusBefore: { type: String, enum: shipmentStatuses },
    statusAfter: { type: String, required: true, enum: shipmentStatuses },
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle" },
    driverId: { type: Schema.Types.ObjectId, ref: "User" },
    assignedVehicleLabel: { type: String, trim: true, maxlength: 160 },
    assignedDriverName: { type: String, trim: true, maxlength: 80 },
    sequence: { type: Number, required: true },
  },
  { _id: true },
);

const latestLocationSchema = new Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    speedKmh: { type: Number },
    bearingDeg: { type: Number },
    observedAt: { type: Date, required: true },
    receivedAt: { type: Date, required: true },
    driverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false },
);

const commissionSideSchema = new Schema(
  {
    payerSide: { type: String, required: true, enum: ["SHIPPER", "CARRIER"] },
    payerAccountId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    planCode: { type: String, required: true },
    planVersionId: { type: Schema.Types.ObjectId, ref: "PlanVersion", required: true },
    contractTermsId: { type: Schema.Types.ObjectId, ref: "ContractTerms" },
    baseFreightVnd: { type: Number, required: true },
    rateBps: { type: Number, required: true },
    calculatedFeeVnd: { type: Number, required: true },
    policyVersion: { type: String, required: true },
    source: { type: String, required: true, enum: ["SIMULATION"] },
    environmentId: { type: String, required: true },
    simulation: { type: Boolean, required: true, validate: (value: boolean) => value === true },
    lockedAt: { type: Date, required: true },
  },
  { _id: false },
);

const commissionSchema = new Schema(
  {
    shipper: { type: commissionSideSchema, required: false },
    carrier: { type: commissionSideSchema, required: false },
    shipperStatus: { type: String, enum: ["ABSENT", "ESTIMATED", "ACCRUED", "VOID", "ON_HOLD"] },
    carrierStatus: { type: String, enum: ["ABSENT", "ESTIMATED", "ACCRUED", "VOID", "ON_HOLD"] },
    outbox: {
      status: { type: String, enum: ["PENDING", "APPLIED", "ERROR"] },
      appliedAt: { type: Date },
    },
  },
  { _id: false },
);

const shipmentSchema = new Schema(
  {
    shipperId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cargoDescription: { type: String, required: true, trim: true },
    pickupLocation: { type: String, required: true, trim: true },
    pickupCompany: { type: String, trim: true, maxlength: 160 },
    pickupContactName: { type: String, trim: true, maxlength: 160 },
    pickupPhone: { type: String, trim: true, maxlength: 20 },
    pickupEmail: { type: String, trim: true, maxlength: 160 },
    pickupDate: { type: String, trim: true, maxlength: 10 },
    pickupTimeFrom: { type: String, trim: true, maxlength: 5 },
    pickupTimeTo: { type: String, trim: true, maxlength: 5 },
    deliveryLocation: { type: String, required: true, trim: true },
    deliveryCompany: { type: String, trim: true, maxlength: 160 },
    deliveryContactName: { type: String, trim: true, maxlength: 160 },
    deliveryPhone: { type: String, trim: true, maxlength: 20 },
    deliveryEmail: { type: String, trim: true, maxlength: 160 },
    deliveryDate: { type: String, trim: true, maxlength: 10 },
    deliveryTimeFrom: { type: String, trim: true, maxlength: 5 },
    deliveryTimeTo: { type: String, trim: true, maxlength: 5 },
    cargoWeightTon: { type: Number },
    cargoVolumeM3: { type: Number },
    packageCount: { type: Number },
    temperatureGroup: { type: String, required: true, enum: temperatureGroups },
    vehicleRequirement: { type: String, required: true, trim: true },
    listedPriceVnd: { type: Number, required: true },
    cargoImageIds: [{ type: Schema.Types.ObjectId, ref: "CargoImage" }],
    status: { type: String, required: true, enum: shipmentStatuses },
    carrierId: { type: Schema.Types.ObjectId, ref: "User" },
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle" },
    driverId: { type: Schema.Types.ObjectId, ref: "User" },
    pickupConfirmedAt: { type: Date },
    pickupConfirmedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deliveryConfirmedAt: { type: Date },
    deliveryConfirmedBy: { type: Schema.Types.ObjectId, ref: "User" },
    events: { type: [shipmentEventSchema], required: false },
    latestLocation: { type: latestLocationSchema, required: false },
    commission: { type: commissionSchema, required: false },
  },
  { timestamps: true },
);

shipmentSchema.index({ status: 1, createdAt: -1 });

export const Shipment = model("Shipment", shipmentSchema);

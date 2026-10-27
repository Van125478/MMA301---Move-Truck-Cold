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

export const temperatureGroups = ["COOL", "FROZEN", "DEEP_FROZEN"] as const;

export type TemperatureGroup = (typeof temperatureGroups)[number];

export type ShipmentCargoImage = { id: string };

/** Mirrors server ShipmentDto in server/src/shipments/shipmentDto.ts. GET /mine omits `timeline`; GET /:id includes it. */
export type Shipment = {
  id: string;
  shipperId: string;
  cargoDescription: string;
  pickupCompany: string | null;
  pickupLocation: string;
  pickupContactName: string | null;
  pickupPhone: string | null;
  pickupEmail: string | null;
  pickupDate: string | null;
  pickupTimeFrom: string | null;
  pickupTimeTo: string | null;
  deliveryCompany: string | null;
  deliveryLocation: string;
  deliveryContactName: string | null;
  deliveryPhone: string | null;
  deliveryEmail: string | null;
  deliveryDate: string | null;
  deliveryTimeFrom: string | null;
  deliveryTimeTo: string | null;
  cargoWeightTon: number | null;
  cargoVolumeM3: number | null;
  packageCount: number | null;
  temperatureGroup: TemperatureGroup;
  temperatureLabel: string;
  vehicleRequirement: string;
  listedPriceVnd: number;
  cargoImages: ShipmentCargoImage[];
  status: ShipmentStatus;
  statusLabel: string;
  carrierId: string | null;
  vehicleId: string | null;
  driverId: string | null;
  vehicleLabel: string | null;
  driverName: string | null;
  pickupConfirmedAt: string | null;
  deliveryConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ShipmentTimelineEvent = {
  id: string;
  type: "PUBLISHED" | "CLAIMED" | "ASSIGNED" | "PICKUP_CONFIRMED" | "DELIVERY_CONFIRMED" | "CANCELLED";
  label: string;
  occurredAt: string;
  actorRole: "SHIPPER" | "CARRIER" | "DRIVER";
  actorLabel: string;
  statusAfter: ShipmentStatus;
  statusAfterLabel: string;
  detail: string | null;
  recorded: boolean;
  sequence: number;
};

export type ShipmentTimeline = {
  completeness: "recorded" | "partial";
  note: string | null;
  events: ShipmentTimelineEvent[];
};

export type ShipmentDetail = Shipment & { timeline: ShipmentTimeline };

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const statusSet = new Set<string>(shipmentStatuses);
const temperatureSet = new Set<string>(temperatureGroups);

export function parseShipment(value: unknown): Shipment | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const id = record.id;
  const shipperId = record.shipperId;
  const status = record.status;
  const temperatureGroup = record.temperatureGroup;
  if (typeof id !== "string" || id.length === 0) return null;
  if (typeof shipperId !== "string") return null;
  if (typeof status !== "string" || !statusSet.has(status)) return null;
  if (typeof temperatureGroup !== "string" || !temperatureSet.has(temperatureGroup)) return null;
  const imagesRaw = record.cargoImages;
  const cargoImages: ShipmentCargoImage[] = Array.isArray(imagesRaw)
    ? imagesRaw
        .map((entry) => (typeof entry === "object" && entry !== null && typeof (entry as { id?: unknown }).id === "string" ? { id: (entry as { id: string }).id } : null))
        .filter((entry): entry is ShipmentCargoImage => entry !== null)
    : [];
  return {
    id,
    shipperId,
    cargoDescription: str(record.cargoDescription),
    pickupCompany: strOrNull(record.pickupCompany),
    pickupLocation: str(record.pickupLocation),
    pickupContactName: strOrNull(record.pickupContactName),
    pickupPhone: strOrNull(record.pickupPhone),
    pickupEmail: strOrNull(record.pickupEmail),
    pickupDate: strOrNull(record.pickupDate),
    pickupTimeFrom: strOrNull(record.pickupTimeFrom),
    pickupTimeTo: strOrNull(record.pickupTimeTo),
    deliveryCompany: strOrNull(record.deliveryCompany),
    deliveryLocation: str(record.deliveryLocation),
    deliveryContactName: strOrNull(record.deliveryContactName),
    deliveryPhone: strOrNull(record.deliveryPhone),
    deliveryEmail: strOrNull(record.deliveryEmail),
    deliveryDate: strOrNull(record.deliveryDate),
    deliveryTimeFrom: strOrNull(record.deliveryTimeFrom),
    deliveryTimeTo: strOrNull(record.deliveryTimeTo),
    cargoWeightTon: numOrNull(record.cargoWeightTon),
    cargoVolumeM3: numOrNull(record.cargoVolumeM3),
    packageCount: numOrNull(record.packageCount),
    temperatureGroup: temperatureGroup as TemperatureGroup,
    temperatureLabel: str(record.temperatureLabel),
    vehicleRequirement: str(record.vehicleRequirement),
    listedPriceVnd: numOrNull(record.listedPriceVnd) ?? 0,
    cargoImages,
    status: status as ShipmentStatus,
    statusLabel: str(record.statusLabel),
    carrierId: strOrNull(record.carrierId),
    vehicleId: strOrNull(record.vehicleId),
    driverId: strOrNull(record.driverId),
    vehicleLabel: strOrNull(record.vehicleLabel),
    driverName: strOrNull(record.driverName),
    pickupConfirmedAt: strOrNull(record.pickupConfirmedAt),
    deliveryConfirmedAt: strOrNull(record.deliveryConfirmedAt),
    createdAt: str(record.createdAt),
    updatedAt: str(record.updatedAt),
  };
}

export function parseShipmentList(value: unknown): Shipment[] {
  if (typeof value !== "object" || value === null) return [];
  const list = (value as { shipments?: unknown }).shipments;
  if (!Array.isArray(list)) return [];
  return list.map(parseShipment).filter((entry): entry is Shipment => entry !== null);
}

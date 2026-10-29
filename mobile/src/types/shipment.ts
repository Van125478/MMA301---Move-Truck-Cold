import { ApiError } from "../services/api/client";

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

export type NextAction = "pickup" | "delivery" | "none";

export type TimelineEvent = {
  id: string;
  label: string;
  occurredAt: string;
  detail: string | null;
  statusAfterLabel: string;
};

export type Shipment = {
  id: string;
  cargoDescription: string;
  pickupCompany: string | null;
  pickupLocation: string;
  pickupContactName: string | null;
  pickupPhone: string | null;
  pickupDate: string | null;
  pickupTimeFrom: string | null;
  pickupTimeTo: string | null;
  deliveryCompany: string | null;
  deliveryLocation: string;
  deliveryContactName: string | null;
  deliveryPhone: string | null;
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
  cargoImageIds: string[];
  status: ShipmentStatus;
  statusLabel: string;
  carrierId: string | null;
  vehicleId: string | null;
  driverId: string | null;
  vehicleLabel: string | null;
  driverName: string | null;
  pickupConfirmedAt: string | null;
  deliveryConfirmedAt: string | null;
  nextAction: NextAction | null;
  timeline: TimelineEvent[];
  hasGpsUpdate: boolean;
};

export type TrackingView = {
  phaseLabel: string;
  latitude: number | null;
  longitude: number | null;
};

export type FleetVehicle = {
  id: string;
  label: string;
  plate: string | null;
  vehicleKindLabel: string | null;
  temperatureLabel: string | null;
  capacityTon: number | null;
  status: "ACTIVE" | "ARCHIVED";
  statusLabel: string;
  canPause: boolean;
  pauseBlockReason: string | null;
  availableForAssignment: boolean;
};

export type FleetDriver = {
  id: string;
  name: string;
  username: string | null;
  accountStatus: "ACTIVE" | "LOCKED";
  mustChangePassword: boolean;
  availableForAssignment: boolean;
  assignmentBlockReason: string | null;
};

const invalid = new ApiError(0, "invalid_response", "Máy chủ trả về đơn không đúng cấu trúc.");

const statusSet = new Set<string>(shipmentStatuses);
const temperatureSet = new Set<string>(temperatureGroups);

const phaseLabels: Record<string, string> = {
  not_started: "Chưa bắt đầu theo dõi vị trí",
  waiting_for_fix: "Đang chờ vị trí từ tài xế",
  current: "Vị trí đang cập nhật",
  stale: "Vị trí đã cũ",
  ended: "Đã kết thúc theo dõi",
};

function recordOf(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw invalid;
  return value as Record<string, unknown>;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function objectIdText(value: unknown): string | null {
  const direct = text(value);
  if (direct) return direct;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string") return text(id);
  }
  return null;
}

function requiredText(record: Record<string, unknown>, key: string): string {
  const value = text(record[key]);
  if (!value) throw invalid;
  return value;
}

function imageIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") return [item];
    if (typeof item === "object" && item !== null && typeof (item as { id?: unknown }).id === "string") return [(item as { id: string }).id];
    return [];
  });
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseTimeline(value: unknown): TimelineEvent[] {
  if (typeof value !== "object" || value === null || !("events" in value)) return [];
  const events = (value as { events?: unknown }).events;
  if (!Array.isArray(events)) return [];
  return events.flatMap((event) => {
    if (typeof event !== "object" || event === null) return [];
    const row = event as Record<string, unknown>;
    const label = text(row.label);
    const occurredAt = text(row.occurredAt);
    if (!label || !occurredAt) return [];
    return [
      {
        id: text(row.id) ?? `${occurredAt}-${label}`,
        label,
        occurredAt,
        detail: text(row.detail),
        statusAfterLabel: text(row.statusAfterLabel) ?? "",
      },
    ];
  });
}

export function parseShipment(value: unknown): Shipment {
  const record = recordOf(value);
  const status = record.status;
  const temperatureGroup = record.temperatureGroup;
  const price = record.listedPriceVnd;
  if (typeof status !== "string" || !statusSet.has(status)) throw invalid;
  if (typeof temperatureGroup !== "string" || !temperatureSet.has(temperatureGroup)) throw invalid;
  if (typeof price !== "number" || !Number.isSafeInteger(price) || price < 0) throw invalid;
  const nextAction = record.nextAction;
  return {
    id: requiredText(record, "id"),
    cargoDescription: requiredText(record, "cargoDescription"),
    pickupCompany: text(record.pickupCompany),
    pickupLocation: requiredText(record, "pickupLocation"),
    pickupContactName: text(record.pickupContactName),
    pickupPhone: text(record.pickupPhone),
    pickupDate: text(record.pickupDate),
    pickupTimeFrom: text(record.pickupTimeFrom),
    pickupTimeTo: text(record.pickupTimeTo),
    deliveryCompany: text(record.deliveryCompany),
    deliveryLocation: requiredText(record, "deliveryLocation"),
    deliveryContactName: text(record.deliveryContactName),
    deliveryPhone: text(record.deliveryPhone),
    deliveryDate: text(record.deliveryDate),
    deliveryTimeFrom: text(record.deliveryTimeFrom),
    deliveryTimeTo: text(record.deliveryTimeTo),
    cargoWeightTon: numberOrNull(record.cargoWeightTon),
    cargoVolumeM3: numberOrNull(record.cargoVolumeM3),
    packageCount: numberOrNull(record.packageCount),
    temperatureGroup: temperatureGroup as TemperatureGroup,
    temperatureLabel: text(record.temperatureLabel) ?? temperatureGroup,
    vehicleRequirement: text(record.vehicleRequirement) ?? "",
    listedPriceVnd: price,
    cargoImageIds: imageIds(record.cargoImages),
    status: status as ShipmentStatus,
    statusLabel: text(record.statusLabel) ?? status,
    carrierId: objectIdText(record.carrierId),
    vehicleId: objectIdText(record.vehicleId),
    driverId: objectIdText(record.driverId),
    vehicleLabel: text(record.vehicleLabel),
    driverName: text(record.driverName),
    pickupConfirmedAt: text(record.pickupConfirmedAt),
    deliveryConfirmedAt: text(record.deliveryConfirmedAt),
    nextAction: nextAction === "pickup" || nextAction === "delivery" || nextAction === "none" ? nextAction : null,
    timeline: parseTimeline(record.timeline),
    hasGpsUpdate: record.hasGpsUpdate === true,
  };
}

export function parseShipmentList(body: unknown): Shipment[] {
  const record = recordOf(body);
  if (!Array.isArray(record.shipments)) throw invalid;
  return record.shipments.map(parseShipment);
}

export function parseShipmentBody(body: unknown): Shipment {
  const record = recordOf(body);
  return parseShipment(record.shipment);
}

export function parseTracking(body: unknown): TrackingView | null {
  const record = recordOf(body);
  const tracking = record.tracking;
  if (typeof tracking !== "object" || tracking === null) return null;
  const row = tracking as Record<string, unknown>;
  const phase = text(row.phase);
  const location = row.location;
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (typeof location === "object" && location !== null) {
    const point = location as Record<string, unknown>;
    if (typeof point.latitude === "number" && typeof point.longitude === "number") {
      latitude = point.latitude;
      longitude = point.longitude;
    }
  }
  return {
    phaseLabel: phase ? (phaseLabels[phase] ?? "Chưa có vị trí") : "Chưa có vị trí",
    latitude,
    longitude,
  };
}

export function parseFleet(body: unknown): { vehicles: FleetVehicle[]; drivers: FleetDriver[] } {
  const record = recordOf(body);
  return {
    vehicles: Array.isArray(record.vehicles) ? record.vehicles.flatMap(parseVehicle) : [],
    drivers: Array.isArray(record.drivers) ? record.drivers.flatMap(parseDriver) : [],
  };
}

function parseVehicle(value: unknown): FleetVehicle[] {
  if (typeof value !== "object" || value === null) return [];
  const row = value as Record<string, unknown>;
  const id = text(row.id);
  const label = text(row.label);
  if (!id || !label) return [];
  return [
    {
      id,
      label,
      plate: text(row.plate),
      vehicleKindLabel: text(row.vehicleKindLabel),
      temperatureLabel: text(row.temperatureLabel),
      capacityTon: typeof row.capacityTon === "number" ? row.capacityTon : null,
      status: row.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
      statusLabel: text(row.statusLabel) ?? (row.status === "ARCHIVED" ? "Tạm dừng" : "Đang hoạt động"),
      canPause: row.canArchive === true,
      pauseBlockReason: text(row.archiveBlockReason),
      availableForAssignment: row.availableForAssignment === true,
    },
  ];
}

function parseDriver(value: unknown): FleetDriver[] {
  if (typeof value !== "object" || value === null) return [];
  const row = value as Record<string, unknown>;
  const id = text(row.id);
  if (!id) return [];
  const name = text(row.displayName) ?? text(row.username) ?? text(row.email) ?? "Tài xế";
  return [
    {
      id,
      name,
      username: text(row.username),
      accountStatus: row.accountStatus === "LOCKED" ? "LOCKED" : "ACTIVE",
      mustChangePassword: row.mustChangePassword === true,
      availableForAssignment: row.availableForAssignment !== false,
      assignmentBlockReason: text(row.assignmentBlockReason),
    },
  ];
}

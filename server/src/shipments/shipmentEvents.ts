import { Types } from "mongoose";
import { User } from "../models/user.js";
import { Vehicle } from "../models/vehicle.js";
import type { ShipmentEventType, ShipmentStatus } from "../models/shipment.js";
import { shipmentStatusLabel } from "./shipmentDto.js";

export type TimelineAudience = "shipper" | "carrier" | "driver";

export type ShipmentTimelineEventDto = {
  id: string;
  type: ShipmentEventType;
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

export type ShipmentTimelineDto = {
  completeness: "recorded" | "partial";
  note: string | null;
  events: ShipmentTimelineEventDto[];
};

type ActorRole = ShipmentTimelineEventDto["actorRole"];

export type NewShipmentEvent = {
  type: ShipmentEventType;
  occurredAt: Date;
  actorId: string;
  actorRole: ActorRole;
  statusBefore: ShipmentStatus | null;
  statusAfter: ShipmentStatus;
  vehicleId?: string;
  driverId?: string;
  assignedVehicleLabel?: string;
  assignedDriverName?: string;
};

type StoredEvent = {
  _id?: { toString(): string };
  type?: ShipmentEventType;
  occurredAt?: Date | null;
  actorId?: { toString(): string } | null;
  actorRole?: ActorRole;
  statusAfter?: ShipmentStatus;
  vehicleId?: { toString(): string } | null;
  driverId?: { toString(): string } | null;
  assignedVehicleLabel?: string | null;
  assignedDriverName?: string | null;
  sequence?: number;
};

export type TimelineSource = {
  _id: { toString(): string };
  shipperId?: { toString(): string } | null;
  createdAt?: Date | null;
  pickupConfirmedAt?: Date | null;
  pickupConfirmedBy?: { toString(): string } | null;
  deliveryConfirmedAt?: Date | null;
  deliveryConfirmedBy?: { toString(): string } | null;
  events?: StoredEvent[] | null;
};

const eventLabels: Record<ShipmentEventType, string> = {
  PUBLISHED: "Đã đăng đơn",
  CLAIMED: "Nhà xe đã nhận chuyến",
  ASSIGNED: "Đã phân công xe và tài xế",
  PICKUP_CONFIRMED: "Đã xác nhận lấy hàng",
  DELIVERY_CONFIRMED: "Đã xác nhận giao hàng",
  CANCELLED: "Đã hủy đơn",
};

const blankActor = { toString: () => "" };

const partialNote =
  "Đơn này được tạo trước khi có lịch sử sự kiện. Chỉ hiện mốc đã lưu thời điểm. Thời điểm nhận chuyến và phân công không được suy diễn.";

export function shipmentEventUpdate(fields: Record<string, unknown>, event: NewShipmentEvent): Array<Record<string, unknown>> {
  const entry: Record<string, unknown> = {
    _id: new Types.ObjectId(),
    type: event.type,
    occurredAt: event.occurredAt,
    actorId: new Types.ObjectId(event.actorId),
    actorRole: event.actorRole,
    statusAfter: event.statusAfter,
    sequence: { $add: [{ $size: { $ifNull: ["$events", []] } }, 1] },
  };
  if (event.statusBefore) entry.statusBefore = event.statusBefore;
  if (event.vehicleId) entry.vehicleId = new Types.ObjectId(event.vehicleId);
  if (event.driverId) entry.driverId = new Types.ObjectId(event.driverId);
  if (event.assignedVehicleLabel) entry.assignedVehicleLabel = event.assignedVehicleLabel;
  if (event.assignedDriverName) entry.assignedDriverName = event.assignedDriverName;
  return [{ $set: { ...castReferences(fields), events: { $concatArrays: [{ $ifNull: ["$events", []] }, [entry]] } } }];
}

export async function attachTimeline<T>(source: TimelineSource, view: T, audience: TimelineAudience): Promise<T & { timeline: ShipmentTimelineDto }> {
  return { ...view, timeline: await buildShipmentTimeline(source, audience) };
}

export async function buildShipmentTimeline(source: TimelineSource, audience: TimelineAudience): Promise<ShipmentTimelineDto> {
  const stored = (source.events ?? []).filter(isStoredEvent);
  if (stored.length > 0) {
    const names = await namesFor(stored.map((event) => event.actorId.toString()), stored);
    return {
      completeness: "recorded",
      note: null,
      events: stored
        .map((event) => toDto(event, audience, names, true))
        .sort(bySequence),
    };
  }
  return {
    completeness: "partial",
    note: partialNote,
    events: await reconstructedEvents(source, audience),
  };
}

function castReferences(fields: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    const reference = key === "carrierId" || key === "vehicleId" || key === "driverId" || key.endsWith("By");
    next[key] = reference && typeof value === "string" ? new Types.ObjectId(value) : value;
  }
  return next;
}

function isStoredEvent(event: StoredEvent): event is StoredEvent & {
  type: ShipmentEventType;
  occurredAt: Date;
  actorId: { toString(): string };
  actorRole: ActorRole;
  statusAfter: ShipmentStatus;
  sequence: number;
} {
  return (
    event.type !== undefined &&
    event.occurredAt instanceof Date &&
    event.actorId != null &&
    event.actorRole !== undefined &&
    event.statusAfter !== undefined &&
    typeof event.sequence === "number"
  );
}

async function reconstructedEvents(source: TimelineSource, audience: TimelineAudience): Promise<ShipmentTimelineEventDto[]> {
  const drafts: Array<StoredEvent & { type: ShipmentEventType; occurredAt: Date; actorId: { toString(): string }; actorRole: ActorRole; statusAfter: ShipmentStatus; sequence: number; id: string }> = [];
  if (source.createdAt instanceof Date && source.shipperId) {
    drafts.push({
      id: `legacy-published-${source._id.toString()}`,
      type: "PUBLISHED",
      occurredAt: source.createdAt,
      actorId: source.shipperId,
      actorRole: "SHIPPER",
      statusAfter: "PUBLISHED",
      sequence: drafts.length + 1,
    });
  }
  if (source.pickupConfirmedAt instanceof Date) {
    drafts.push({
      id: `legacy-pickup-${source._id.toString()}`,
      type: "PICKUP_CONFIRMED",
      occurredAt: source.pickupConfirmedAt,
      actorId: source.pickupConfirmedBy ?? blankActor,
      actorRole: "DRIVER",
      statusAfter: "IN_TRANSIT",
      sequence: drafts.length + 1,
    });
  }
  if (source.deliveryConfirmedAt instanceof Date) {
    drafts.push({
      id: `legacy-delivery-${source._id.toString()}`,
      type: "DELIVERY_CONFIRMED",
      occurredAt: source.deliveryConfirmedAt,
      actorId: source.deliveryConfirmedBy ?? blankActor,
      actorRole: "DRIVER",
      statusAfter: "DELIVERY_CONFIRMED",
      sequence: drafts.length + 1,
    });
  }
  const names = await namesFor(
    drafts.map((event) => event.actorId.toString()),
    drafts,
  );
  return drafts.map((event) => toDto(event, audience, names, false));
}

async function namesFor(actorIds: string[], events: readonly StoredEvent[]): Promise<{ users: Map<string, string>; vehicles: Map<string, string> }> {
  const userIds = new Set(actorIds.filter((id) => id.length > 0));
  const vehicleIds = new Set<string>();
  for (const event of events) {
    if (event.driverId) userIds.add(event.driverId.toString());
    if (event.vehicleId) vehicleIds.add(event.vehicleId.toString());
  }
  const [users, vehicles] = await Promise.all([
    userIds.size === 0 ? [] : User.find({ _id: { $in: [...userIds] } }).select("displayName"),
    vehicleIds.size === 0 ? [] : Vehicle.find({ _id: { $in: [...vehicleIds] } }).select("label"),
  ]);
  return {
    users: new Map(users.flatMap((user) => (user.displayName ? [[user._id.toString(), user.displayName] as const] : []))),
    vehicles: new Map(vehicles.map((vehicle) => [vehicle._id.toString(), vehicle.label])),
  };
}

function toDto(
  event: StoredEvent & { type: ShipmentEventType; occurredAt: Date; actorId: { toString(): string }; actorRole: ActorRole; statusAfter: ShipmentStatus; sequence: number; id?: string },
  audience: TimelineAudience,
  names: { users: Map<string, string>; vehicles: Map<string, string> },
  recorded: boolean,
): ShipmentTimelineEventDto {
  const assigned = event.type === "ASSIGNED" && event.vehicleId != null && event.driverId != null;
  const vehicleLabel = storedName(event.assignedVehicleLabel) ?? (event.vehicleId ? (names.vehicles.get(event.vehicleId.toString()) ?? null) : null);
  const driverName = storedName(event.assignedDriverName) ?? (event.driverId ? (names.users.get(event.driverId.toString()) ?? null) : null);
  return {
    id: event.id ?? event._id?.toString() ?? `${event.type}-${event.sequence}`,
    type: event.type,
    label: eventLabels[event.type],
    occurredAt: event.occurredAt.toISOString(),
    actorRole: event.actorRole,
    actorLabel: actorLabel(event.actorRole, event.actorId.toString(), audience, names.users),
    statusAfter: event.statusAfter,
    statusAfterLabel: shipmentStatusLabel(event.statusAfter, assigned),
    detail: eventDetail(event.type, vehicleLabel, driverName),
    recorded,
    sequence: event.sequence,
  };
}

function actorLabel(role: ActorRole, actorId: string, audience: TimelineAudience, users: Map<string, string>): string {
  if (role === "SHIPPER") return "Chủ hàng";
  if (role === "CARRIER" && audience === "carrier") return "Nhà xe";
  const name = users.get(actorId);
  if (role === "CARRIER") return name ?? "Nhà xe";
  return name ?? "Tài xế";
}

function storedName(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function assignmentDetail(vehicleLabel: string | null, driverName: string | null): string {
  return `${presentLabel(vehicleLabel, "Xe", "Xe đã phân công")}. ${presentLabel(driverName, "Tài xế", "Tài xế đã phân công")}.`;
}

function presentLabel(value: string | null, prefix: string, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) return fallback;
  const folded = trimmed.toLocaleLowerCase("vi-VN");
  const token = prefix.toLocaleLowerCase("vi-VN");
  if (folded === token || folded.startsWith(`${token} `)) return trimmed;
  return `${prefix} ${trimmed}`;
}

function eventDetail(type: ShipmentEventType, vehicleLabel: string | null, driverName: string | null): string | null {
  if (type === "ASSIGNED") return assignmentDetail(vehicleLabel, driverName);
  if (type === "DELIVERY_CONFIRMED") return "Xác nhận giao hàng chưa phải thanh toán.";
  return null;
}

function bySequence(left: ShipmentTimelineEventDto, right: ShipmentTimelineEventDto): number {
  return left.sequence - right.sequence || left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id);
}

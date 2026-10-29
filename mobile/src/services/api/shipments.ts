import type { UserRole } from "../../types/auth";
import {
  parseFleet,
  parseShipmentBody,
  parseShipmentList,
  parseTracking,
  type FleetDriver,
  type FleetVehicle,
  type Shipment,
  type TrackingView,
} from "../../types/shipment";
import { apiRequest } from "./client";
import { authed } from "./authed";

export type PublishFields = {
  cargoDescription: string;
  pickupCompany: string;
  pickupLocation: string;
  pickupContactName: string;
  pickupPhone: string;
  pickupEmail: string | null;
  pickupDate: string;
  pickupTimeFrom: string;
  pickupTimeTo: string;
  deliveryCompany: string;
  deliveryLocation: string;
  deliveryContactName: string;
  deliveryPhone: string;
  deliveryEmail: string | null;
  deliveryDate: string;
  deliveryTimeFrom: string;
  deliveryTimeTo: string;
  cargoWeightTon: number;
  cargoVolumeM3: number;
  packageCount: number;
  temperatureGroup: "COOL" | "FROZEN" | "DEEP_FROZEN";
  vehicleRequirement: string;
  listedPriceVnd: number;
};

export type PublishBody = PublishFields & { cargoImageIds: string[] };

export type ListMode = "mine" | "board" | "claimed" | "driver";

const listPath: Record<ListMode, string> = {
  mine: "/api/shipments/mine",
  board: "/api/carrier/shipments",
  claimed: "/api/carrier/shipments/claimed",
  driver: "/api/driver/shipments",
};

export function listShipments(mode: ListMode): Promise<Shipment[]> {
  return authed<unknown>(listPath[mode]).then(parseShipmentList);
}

/** Sàn đơn đang tìm xe — cùng nguồn cho Landing và block sàn trên app chủ hàng. */
export function listMarketplaceShipments(): Promise<Shipment[]> {
  return apiRequest<unknown>("/api/marketplace/shipments").then((result) => parseShipmentList(result.data));
}

export function loadShipment(role: UserRole, id: string): Promise<Shipment> {
  const path =
    role === "CARRIER"
      ? `/api/carrier/shipments/${id}`
      : role === "DRIVER"
        ? `/api/driver/shipments/${id}`
        : `/api/shipments/${id}`;
  return authed<unknown>(path).then(parseShipmentBody);
}

export function createShipment(body: PublishBody): Promise<Shipment> {
  return authed<unknown>("/api/shipments", { method: "POST", body }).then(parseShipmentBody);
}

export function cancelShipment(id: string): Promise<Shipment> {
  return authed<unknown>(`/api/shipments/${id}/cancel`, { method: "POST", body: {} }).then(parseShipmentBody);
}

export function claimShipment(id: string): Promise<Shipment> {
  return authed<unknown>(`/api/carrier/shipments/${id}/claim`, { method: "POST", body: {} }).then(parseShipmentBody);
}

export function assignShipment(id: string, vehicleId: string, driverId: string): Promise<Shipment> {
  return authed<unknown>(`/api/carrier/shipments/${id}/assign`, {
    method: "POST",
    body: { vehicleId, driverId },
  }).then(parseShipmentBody);
}

export function confirmPickup(id: string): Promise<Shipment> {
  return authed<unknown>(`/api/driver/shipments/${id}/pickup`, { method: "POST", body: {} }).then(parseShipmentBody);
}

export function confirmDelivery(id: string): Promise<Shipment> {
  return authed<unknown>(`/api/driver/shipments/${id}/delivery`, { method: "POST", body: {} }).then(parseShipmentBody);
}

export function loadTracking(role: UserRole, id: string): Promise<TrackingView | null> {
  const path =
    role === "CARRIER"
      ? `/api/carrier/shipments/${id}/location`
      : role === "DRIVER"
        ? `/api/driver/shipments/${id}/location`
        : `/api/shipments/${id}/location`;
  return authed<unknown>(path).then(parseTracking);
}

export type ShipmentReview = {
  id: string;
  stars: number;
  comment: string;
  createdAt: string;
};

export type ReviewGroup = { stars: number; count: number };

export type ReviewBundle = {
  reviews: ShipmentReview[];
  total: number;
  groups: ReviewGroup[];
};

function parseReview(value: unknown): ShipmentReview | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.comment !== "string" || typeof row.createdAt !== "string") return null;
  if (typeof row.stars !== "number") return null;
  return { id: row.id, stars: row.stars, comment: row.comment, createdAt: row.createdAt };
}

export async function loadReviews(id: string): Promise<ReviewBundle> {
  const body = await authed<{ reviews?: unknown; total?: unknown; groups?: unknown }>(`/api/shipment-reviews/${id}`);
  const reviews = Array.isArray(body.reviews) ? body.reviews.flatMap((row) => {
    const parsed = parseReview(row);
    return parsed ? [parsed] : [];
  }) : [];
  const groups = Array.isArray(body.groups)
    ? body.groups.flatMap((row) => {
        if (typeof row !== "object" || row === null) return [];
        const group = row as Record<string, unknown>;
        if (typeof group.stars !== "number" || typeof group.count !== "number") return [];
        return [{ stars: group.stars, count: group.count }];
      })
    : [];
  return { reviews, total: typeof body.total === "number" ? body.total : reviews.length, groups };
}

export function submitReview(id: string, stars: number, comment: string): Promise<void> {
  return authed(`/api/mobile/shipments/${id}/reviews`, { method: "POST", body: { stars, comment } }).then(() => undefined);
}

export function reportDriverLocation(
  id: string,
  sample: {
    latitude: number;
    longitude: number;
    speedKmh: number | null;
    bearingDeg: number | null;
    observedAt: string;
  },
): Promise<TrackingView | null> {
  return authed<unknown>(`/api/driver/shipments/${id}/location`, { method: "POST", body: sample }).then(parseTracking);
}

export async function loadFleet(): Promise<{ vehicles: FleetVehicle[]; drivers: FleetDriver[] }> {
  const [vehiclesBody, driversBody] = await Promise.all([
    authed<unknown>("/api/carrier/fleet/vehicles"),
    authed<unknown>("/api/carrier/fleet/drivers"),
  ]);
  const vehicles = parseFleet(vehiclesBody).vehicles;
  const drivers = parseFleet(driversBody).drivers;
  return { vehicles, drivers };
}

/** POST /api/cargo-images — SHIPPER only. Raw image bytes; Content-Type must be image/jpeg|png|webp. */
export async function uploadCargoImage(data: ArrayBuffer, contentType: string): Promise<string> {
  const body = await authed<{ image?: { id?: unknown } }>("/api/cargo-images", { method: "POST", rawBody: { data, contentType } });
  const id = body?.image?.id;
  if (typeof id !== "string" || id.length === 0) throw new Error("invalid_cargo_image_response");
  return id;
}

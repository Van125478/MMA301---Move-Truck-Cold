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
import { ApiError, apiRequest } from "./client";
import { apiOrigin } from "../../constants/config";
import { readSessionToken } from "./sessionStore";
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

export type MineQuery = { statuses?: readonly string[]; temperatureGroup?: string; q?: string; page: number; limit: number };

export type MinePage = { shipments: Shipment[]; total: number; hasMore: boolean };

/** GET /api/shipments/mine có lọc và phân trang phía server (chỉ chủ hàng). */
export function listMyShipments(query: MineQuery): Promise<MinePage> {
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit) });
  if (query.statuses && query.statuses.length > 0) params.set("statuses", query.statuses.join(","));
  if (query.temperatureGroup && query.temperatureGroup !== "ALL") params.set("temperatureGroup", query.temperatureGroup);
  if (query.q?.trim()) params.set("q", query.q.trim());
  return authed<unknown>(`${listPath.mine}?${params.toString()}`).then((body) => {
    const shipments = parseShipmentList(body);
    const record = body as { total?: unknown; hasMore?: unknown };
    return {
      shipments,
      total: typeof record.total === "number" ? record.total : shipments.length,
      hasMore: record.hasMore === true,
    };
  });
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

export type FreightMethod = "BANK_TRANSFER" | "CASH";

export type FreightPayment = {
  status: "UNPAID" | "RECORDED" | "CONFIRMED";
  amountVnd: number;
  method: FreightMethod | null;
  methodLabel: string | null;
  reference: string | null;
  recordedAt: string | null;
  confirmedAt: string | null;
  platformCollected: false;
  label: string;
};

const invalidPayment = new ApiError(0, "invalid_response", "Máy chủ trả về thanh toán không đúng cấu trúc.");

function parseFreightPayment(body: unknown): FreightPayment {
  if (typeof body !== "object" || body === null || !("payment" in body)) throw invalidPayment;
  const payment = (body as { payment?: unknown }).payment;
  if (typeof payment !== "object" || payment === null) throw invalidPayment;
  const row = payment as Record<string, unknown>;
  const status = row.status;
  if (status !== "UNPAID" && status !== "RECORDED" && status !== "CONFIRMED") throw invalidPayment;
  if (typeof row.amountVnd !== "number" || !Number.isInteger(row.amountVnd)) throw invalidPayment;
  if (row.platformCollected !== false) throw invalidPayment;
  if (typeof row.label !== "string") throw invalidPayment;
  const method = row.method === null ? null : row.method === "BANK_TRANSFER" || row.method === "CASH" ? row.method : null;
  if (row.method !== null && method === null) throw invalidPayment;
  return {
    status,
    amountVnd: row.amountVnd,
    method,
    methodLabel: typeof row.methodLabel === "string" ? row.methodLabel : null,
    reference: typeof row.reference === "string" ? row.reference : null,
    recordedAt: typeof row.recordedAt === "string" ? row.recordedAt : null,
    confirmedAt: typeof row.confirmedAt === "string" ? row.confirmedAt : null,
    platformCollected: false,
    label: row.label,
  };
}

export function loadFreightPayment(id: string): Promise<FreightPayment> {
  return authed<unknown>(`/api/freight-payments/${id}`).then(parseFreightPayment);
}

export function recordFreightPayment(id: string, method: FreightMethod, reference: string | null): Promise<FreightPayment> {
  const body = method === "BANK_TRANSFER" ? { method, reference } : { method };
  return authed<unknown>(`/api/freight-payments/${id}`, { method: "POST", body }).then(parseFreightPayment);
}

export function confirmFreightPayment(id: string): Promise<FreightPayment> {
  return authed<unknown>(`/api/freight-payments/${id}/confirm`, { method: "POST", body: {} }).then(parseFreightPayment);
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

/** Ảnh hàng hóa cần đăng nhập: native gửi cookie phiên qua header, web dùng cookie của trình duyệt. */
export async function cargoImageSource(id: string): Promise<{ uri: string; headers?: Record<string, string> }> {
  const uri = `${apiOrigin}/api/cargo-images/${encodeURIComponent(id)}`;
  const token = await readSessionToken();
  return token ? { uri, headers: { Cookie: `coldi_session=${token}` } } : { uri };
}

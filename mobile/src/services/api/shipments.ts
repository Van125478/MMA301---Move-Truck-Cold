import { Platform } from "react-native";
import { apiRequest } from "./client";
import { readSessionToken } from "./sessionStore";
import { parseShipment, parseShipmentList, type Shipment, type ShipmentDetail } from "../../types/shipment";
import type { PublishPayload } from "../../features/shipments/shipmentDraftValidation";

async function currentToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  return readSessionToken();
}

/** GET /api/shipments/mine — SHIPPER only. Sorted by createdAt desc on the server. No `timeline` field here. */
export async function fetchMyShipments(): Promise<Shipment[]> {
  const token = await currentToken();
  const result = await apiRequest<unknown>("/api/shipments/mine", { sessionToken: token });
  return parseShipmentList(result.data);
}

/** GET /api/shipments/:id — SHIPPER, must own the shipment. Includes `timeline`. */
export async function fetchShipmentDetail(id: string): Promise<ShipmentDetail> {
  const token = await currentToken();
  const result = await apiRequest<unknown>(`/api/shipments/${id}`, { sessionToken: token });
  const body = typeof result.data === "object" && result.data !== null ? (result.data as { shipment?: unknown }).shipment : null;
  const shipment = parseShipment(body);
  if (!shipment) throw new Error("invalid_shipment_response");
  const timeline = typeof body === "object" && body !== null ? (body as { timeline?: unknown }).timeline : null;
  return { ...shipment, timeline: (timeline as ShipmentDetail["timeline"]) ?? { completeness: "partial", note: null, events: [] } };
}

/** POST /api/cargo-images — SHIPPER only. Body is the raw image bytes; Content-Type must be image/jpeg|png|webp. */
export async function uploadCargoImage(data: ArrayBuffer, contentType: string): Promise<string> {
  const token = await currentToken();
  const result = await apiRequest<unknown>("/api/cargo-images", {
    method: "POST",
    sessionToken: token,
    rawBody: { data, contentType },
  });
  const image = typeof result.data === "object" && result.data !== null ? (result.data as { image?: unknown }).image : null;
  const id = typeof image === "object" && image !== null ? (image as { id?: unknown }).id : null;
  if (typeof id !== "string" || id.length === 0) throw new Error("invalid_cargo_image_response");
  return id;
}

/** POST /api/shipments — SHIPPER only. Creates with status PUBLISHED. */
export async function createShipment(payload: PublishPayload): Promise<Shipment> {
  const token = await currentToken();
  const result = await apiRequest<unknown>("/api/shipments", {
    method: "POST",
    body: payload,
    sessionToken: token,
  });
  const body = typeof result.data === "object" && result.data !== null ? (result.data as { shipment?: unknown }).shipment : null;
  const shipment = parseShipment(body);
  if (!shipment) throw new Error("invalid_shipment_response");
  return shipment;
}

/** POST /api/shipments/:id/cancel — SHIPPER, only while status is PUBLISHED. Body must be empty. */
export async function cancelShipment(id: string): Promise<Shipment> {
  const token = await currentToken();
  const result = await apiRequest<unknown>(`/api/shipments/${id}/cancel`, {
    method: "POST",
    body: {},
    sessionToken: token,
  });
  const body = typeof result.data === "object" && result.data !== null ? (result.data as { shipment?: unknown }).shipment : null;
  const shipment = parseShipment(body);
  if (!shipment) throw new Error("invalid_shipment_response");
  return shipment;
}

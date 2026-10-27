import { authed, authedUpload } from "./authed";

export function operationKey(): string {
  return `app${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.replace(/[^A-Za-z0-9]/g, "x").slice(0, 40);
}

export async function uploadCargoImage(bytes: ArrayBuffer, contentType: string): Promise<string> {
  const body = await authedUpload("/api/cargo-images", bytes, contentType);
  const image = typeof body === "object" && body !== null && "image" in body ? (body as { image?: { id?: unknown } }).image : undefined;
  if (!image || typeof image.id !== "string") throw new Error("Máy chủ không trả mã ảnh.");
  return image.id;
}

export type ChatMessage = { id: string; senderRole: string; body: string; createdAt: string };

export async function openChat(role: "SHIPPER" | "CARRIER", shipmentId: string): Promise<string> {
  if (role === "CARRIER") {
    const body = await authed<{ conversation?: { id?: string } }>(`/api/carrier/conversations/by-shipment/${shipmentId}`, { method: "POST", body: {} });
    if (!body.conversation?.id) throw new Error("Không mở được cuộc trao đổi.");
    return body.conversation.id;
  }
  const body = await authed<{ conversation?: { id?: string } }>(`/api/shipments/${shipmentId}/conversations`, { method: "POST", body: {} });
  if (!body.conversation?.id) throw new Error("Không mở được cuộc trao đổi.");
  return body.conversation.id;
}

export async function loadChat(role: "SHIPPER" | "CARRIER", shipmentId: string, conversationId: string): Promise<ChatMessage[]> {
  const path = role === "CARRIER"
    ? `/api/carrier/conversations/${conversationId}/messages`
    : `/api/shipments/${shipmentId}/conversations/${conversationId}/messages`;
  const body = await authed<{ messages?: unknown }>(path);
  if (!Array.isArray(body.messages)) return [];
  return body.messages.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.body !== "string") return [];
    return [{ id: row.id, senderRole: typeof row.senderRole === "string" ? row.senderRole : "", body: row.body, createdAt: typeof row.createdAt === "string" ? row.createdAt : "" }];
  });
}

export function sendChat(role: "SHIPPER" | "CARRIER", shipmentId: string, conversationId: string, text: string): Promise<void> {
  const path = role === "CARRIER"
    ? `/api/carrier/conversations/${conversationId}/messages`
    : `/api/shipments/${shipmentId}/conversations/${conversationId}/messages`;
  return authed(path, { method: "POST", body: { body: text } }).then(() => undefined);
}

export type PlanSummary = {
  code: string;
  name: string;
  priceVnd: number;
  vehicleCap: number | null;
  activeVehicleCount: number;
  overLimit: boolean;
  endsAt: string | null;
  note: string;
};

export type CatalogPlan = {
  code: string;
  name: string;
  priceVnd: number | null;
  listPriceLabel: string;
  vehicleCap: number | null;
  billingCycle: string;
};

export async function loadPlan(): Promise<PlanSummary> {
  const body = await authed<{ plan?: Record<string, unknown>; entitlements?: Record<string, unknown> }>("/api/packages/my-plan");
  const plan = body.plan ?? {};
  const rights = body.entitlements ?? {};
  return {
    code: typeof plan.code === "string" ? plan.code : "",
    name: typeof plan.name === "string" ? plan.name : "Gói Free",
    priceVnd: typeof plan.priceVnd === "number" ? plan.priceVnd : 0,
    vehicleCap: typeof rights.vehicleCap === "number" ? rights.vehicleCap : null,
    activeVehicleCount: typeof rights.activeVehicleCount === "number" ? rights.activeVehicleCount : 0,
    overLimit: rights.overLimit === true,
    endsAt: typeof plan.endsAt === "string" ? plan.endsAt : null,
    note: typeof plan.label === "string" ? plan.label : "Gói này chưa thu tiền trên app.",
  };
}

export type IncidentRow = {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  incidentTypeLabel: string;
  version: number;
  description: string;
};

export async function listIncidents(shipmentId: string): Promise<IncidentRow[]> {
  const body = await authed<{ incidents?: unknown }>(`/api/incidents?shipmentId=${encodeURIComponent(shipmentId)}`);
  if (!Array.isArray(body.incidents)) return [];
  return body.incidents.flatMap(parseIncident);
}

export function createIncident(shipmentId: string, incidentType: string, title: string, description: string): Promise<void> {
  return authed("/api/incidents", {
    method: "POST",
    body: { shipmentId, incidentType, title, description, idempotencyKey: operationKey() },
  }).then(() => undefined);
}

export function actOnIncident(id: string, action: "acknowledge" | "start" | "resolve" | "object", version: number, note?: string): Promise<void> {
  const key = operationKey();
  const body: Record<string, unknown> = { expectedVersion: version, idempotencyKey: key };
  if (action === "start") body.note = note ?? "";
  if (action === "resolve") body.resolutionSummary = note ?? "";
  if (action === "object") body.objectionReason = note ?? "";
  return authed(`/api/incidents/${id}/${action}`, { method: "POST", body }).then(() => undefined);
}

function parseIncident(value: unknown): IncidentRow[] {
  if (typeof value !== "object" || value === null) return [];
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.title !== "string" || typeof row.version !== "number") return [];
  return [{
    id: row.id,
    title: row.title,
    status: typeof row.status === "string" ? row.status : "",
    statusLabel: typeof row.statusLabel === "string" ? row.statusLabel : "",
    incidentTypeLabel: typeof row.incidentTypeLabel === "string" ? row.incidentTypeLabel : "",
    version: row.version,
    description: typeof row.description === "string" ? row.description : "",
  }];
}

export function archiveVehicle(id: string): Promise<void> {
  return authed(`/api/carrier/fleet/vehicles/${id}/archive`, { method: "POST", body: {} }).then(() => undefined);
}

export async function loadCatalog(audience: "SHIPPER" | "CARRIER"): Promise<CatalogPlan[]> {
  const body = await authed<{ plans?: unknown }>("/api/packages/catalog");
  if (!Array.isArray(body.plans)) return [];
  return body.plans.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const row = item as Record<string, unknown>;
    if (row.audience !== audience || typeof row.code !== "string" || typeof row.name !== "string") return [];
    return [{
      code: row.code,
      name: row.name,
      priceVnd: typeof row.priceVnd === "number" ? row.priceVnd : null,
      listPriceLabel: typeof row.listPriceLabel === "string" ? row.listPriceLabel : "",
      vehicleCap: typeof row.vehicleCap === "number" ? row.vehicleCap : null,
      billingCycle: typeof row.billingCycle === "string" ? row.billingCycle : "",
    }];
  });
}

export function choosePlan(planCode: string): Promise<void> {
  return authed("/api/packages/my-plan/demo-activate", {
    method: "POST",
    body: { planCode, idempotencyKey: operationKey() },
  }).then(() => undefined);
}

export function createVehicle(input: { label: string; plate: string; vehicleKind: string; temperatureGroup: string; capacityTon: number }): Promise<void> {
  return authed("/api/carrier/fleet/vehicles", { method: "POST", body: input }).then(() => undefined);
}

export function createDriver(input: { displayName: string; username: string; password: string; confirmPassword: string }): Promise<void> {
  return authed("/api/carrier/fleet/drivers", { method: "POST", body: input }).then(() => undefined);
}

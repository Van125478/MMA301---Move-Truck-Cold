import { isValidObjectId } from "mongoose";
import { HttpError } from "../middlewares/errorHandler.js";
import type { Actor } from "../incidents/access.js";
import { markNotificationRead, unreadNotificationCount } from "../incidents/service.js";
import { Incident } from "../models/incident.js";
import { IncidentNotification } from "../models/incidentNotification.js";
import { OrderNotice, type OrderNoticeKind } from "../models/orderNotice.js";
import { Shipment } from "../models/shipment.js";

export function orderNoticeBody(cargo: string, pickup: string, delivery: string): string {
  return `${cargo} · ${pickup} → ${delivery}`;
}

export async function recordOrderNotice(input: {
  recipientId: string;
  shipmentId: string;
  kind: OrderNoticeKind;
  title: string;
  body: string;
}): Promise<void> {
  if (!isValidObjectId(input.recipientId) || !isValidObjectId(input.shipmentId)) return;
  try {
    await OrderNotice.updateOne(
      { recipientId: input.recipientId, shipmentId: input.shipmentId, kind: input.kind },
      { $setOnInsert: { title: input.title, body: input.body, readAt: null } },
      { upsert: true },
    );
  } catch (error) {
    console.error("Order notice was not stored.", error);
  }
}

type NoticeSource = {
  _id: { toString(): string };
  shipmentId: { toString(): string };
  title: string;
  body: string;
  kind: OrderNoticeKind;
  createdAt: Date;
  readAt?: Date | null;
};

export type InboxNotice = {
  id: string;
  shipmentId: string;
  kind: OrderNoticeKind | "INCIDENT";
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

function toView(row: NoticeSource): InboxNotice {
  return {
    id: `order_${row._id.toString()}`,
    shipmentId: row.shipmentId.toString(),
    kind: row.kind,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    read: row.readAt != null,
  };
}

export async function listOrderNotices(recipientId: string, actor: Actor): Promise<InboxNotice[]> {
  const [orders, incidents] = await Promise.all([
    OrderNotice.find({ recipientId }).sort({ createdAt: -1, _id: -1 }).limit(40).lean<NoticeSource[]>(),
    incidentInbox(actor),
  ]);
  return [...orders.map(toView), ...incidents].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 40);
}

async function incidentInbox(actor: Actor): Promise<InboxNotice[]> {
  const rows = await IncidentNotification.find({ recipientId: actor.id }).sort({ createdAt: -1, _id: -1 }).limit(40).lean<
    {
      _id: { toString(): string };
      incidentId: { toString(): string };
      label: string;
      createdAt: Date;
      readAt?: Date | null;
    }[]
  >();
  if (rows.length === 0) return [];
  const incidents = await Incident.find({ _id: { $in: rows.map((row) => row.incidentId.toString()) } })
    .select("shipmentId title")
    .lean<{ _id: { toString(): string }; shipmentId: { toString(): string }; title: string }[]>();
  const byIncident = new Map(incidents.map((row) => [row._id.toString(), row]));
  const shipmentIds = [...new Set(incidents.map((row) => row.shipmentId.toString()))];
  const shipments = await Shipment.find({ _id: { $in: shipmentIds } })
    .select("cargoDescription pickupLocation deliveryLocation")
    .lean<{ _id: { toString(): string }; cargoDescription: string; pickupLocation: string; deliveryLocation: string }[]>();
  const byShipment = new Map(shipments.map((row) => [row._id.toString(), row]));
  return rows.flatMap((row) => {
    const incident = byIncident.get(row.incidentId.toString());
    if (!incident) return [];
    const shipment = byShipment.get(incident.shipmentId.toString());
    const route = shipment ? orderNoticeBody(shipment.cargoDescription, shipment.pickupLocation, shipment.deliveryLocation) : incident.title;
    return [
      {
        id: `incident_${row._id.toString()}`,
        shipmentId: incident.shipmentId.toString(),
        kind: "INCIDENT" as const,
        title: `Sự cố · ${row.label}`,
        body: route,
        createdAt: row.createdAt.toISOString(),
        read: row.readAt != null,
      },
    ];
  });
}

export async function unreadOrderNoticeCount(actor: Actor): Promise<number> {
  const [orders, incidents] = await Promise.all([
    OrderNotice.countDocuments({ recipientId: actor.id, readAt: null }),
    unreadNotificationCount(actor),
  ]);
  return orders + incidents;
}

export async function markOrderNoticeRead(recipientId: string, noticeId: string, actor?: Actor) {
  if (noticeId.startsWith("incident_")) {
    if (!actor) throw new HttpError(404, "not_found", "Không tìm thấy thông báo này.");
    const marked = await markNotificationRead(actor, noticeId.slice("incident_".length));
    return {
      id: noticeId,
      shipmentId: "",
      kind: "INCIDENT" as const,
      title: `Sự cố · ${marked.label}`,
      body: "",
      createdAt: marked.createdAt,
      read: marked.read,
    };
  }
  const orderId = noticeId.startsWith("order_") ? noticeId.slice("order_".length) : noticeId;
  if (!isValidObjectId(orderId)) throw new HttpError(404, "not_found", "Không tìm thấy thông báo này.");
  const existing = await OrderNotice.findOne({ _id: orderId, recipientId }).lean<NoticeSource | null>();
  if (!existing) throw new HttpError(404, "not_found", "Không tìm thấy thông báo này.");
  if (existing.readAt) return toView(existing);
  const updated = await OrderNotice.findOneAndUpdate(
    { _id: orderId, recipientId, readAt: null },
    { $set: { readAt: new Date() } },
    { returnDocument: "after" },
  ).lean<NoticeSource | null>();
  return toView(updated ?? existing);
}

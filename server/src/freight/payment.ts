import { isValidObjectId } from "mongoose";
import { recordSuccessfulAudit } from "../audit/recordAudit.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { FreightPayment, type FreightPaymentMethod } from "../models/freightPayment.js";
import { Shipment } from "../models/shipment.js";
import type { UserRole } from "../models/user.js";
import { orderNoticeBody, recordOrderNotice } from "../orders/notices.js";

const methodLabels: Record<FreightPaymentMethod, string> = {
  BANK_TRANSFER: "Chuyển khoản",
  CASH: "Tiền mặt",
};

export type FreightPaymentView = {
  status: "UNPAID" | "RECORDED" | "CONFIRMED";
  amountVnd: number;
  method: FreightPaymentMethod | null;
  methodLabel: string | null;
  reference: string | null;
  recordedAt: string | null;
  confirmedAt: string | null;
  platformCollected: false;
  label: string;
};

type Actor = { id: string; role: UserRole };

type StoredPayment = {
  amountVnd: number;
  method: string;
  reference?: string | null;
  status: string;
  recordedAt: Date;
  confirmedAt?: Date | null;
};

export async function readFreightPayment(shipmentId: string, actor: Actor): Promise<FreightPaymentView> {
  const shipment = await loadPartyShipment(shipmentId, actor);
  const row = await FreightPayment.findOne({ shipmentId: shipment._id });
  return present(shipment, row);
}

export async function recordFreightPayment(
  shipmentId: string,
  actor: Actor,
  body: unknown,
): Promise<{ created: boolean; payment: FreightPaymentView }> {
  const shipment = await loadPartyShipment(shipmentId, actor);
  if (actor.role !== "SHIPPER" || shipment.shipperId.toString() !== actor.id) {
    throw new HttpError(403, "forbidden", "Chỉ chủ hàng của đơn này ghi nhận thanh toán.");
  }
  assertPayable(shipment);
  const input = readRecordBody(body);
  const carrierRef = shipment.carrierId;
  if (!carrierRef) throw new HttpError(409, "freight_carrier_missing", "Đơn chưa có nhà xe để nhận tiền.");
  const carrierId = carrierRef.toString();
  const recordedAt = new Date();
  try {
    await FreightPayment.create({
      shipmentId: shipment._id,
      shipperId: shipment.shipperId,
      carrierId: carrierRef,
      amountVnd: shipment.listedPriceVnd,
      method: input.method,
      ...(input.reference ? { reference: input.reference } : {}),
      status: "RECORDED",
      platformCollected: false,
      recordedBy: actor.id,
      recordedAt,
    });
  } catch (error) {
    if (!isDuplicate(error)) throw error;
    const existing = await FreightPayment.findOne({ shipmentId: shipment._id });
    if (existing && existing.method === input.method && (existing.reference ?? null) === (input.reference ?? null)) {
      return { created: false, payment: present(shipment, existing) };
    }
    throw new HttpError(409, "freight_already_recorded", "Đơn này đã được ghi nhận thanh toán.");
  }

  await recordOrderNotice({
    recipientId: carrierId,
    shipmentId: shipment._id.toString(),
    kind: "FREIGHT_RECORDED",
    title: "Chủ hàng đã ghi nhận thanh toán",
    body: orderNoticeBody(shipment.cargoDescription, shipment.pickupLocation, shipment.deliveryLocation),
  });
  await recordSuccessfulAudit({
    action: "FREIGHT_PAYMENT_RECORDED",
    actorId: actor.id,
    actorRole: "SHIPPER",
    resourceType: "shipment",
    resourceId: shipment._id.toString(),
    statusBefore: "UNPAID",
    statusAfter: "RECORDED",
    relatedCarrierId: carrierId,
    fields: [input.method],
  });
  const saved = await FreightPayment.findOne({ shipmentId: shipment._id });
  if (!saved) throw new Error("Freight payment was not stored.");
  return { created: true, payment: present(shipment, saved) };
}

export async function confirmFreightPayment(shipmentId: string, actor: Actor, body: unknown): Promise<FreightPaymentView> {
  const shipment = await loadPartyShipment(shipmentId, actor);
  if (actor.role !== "CARRIER" || shipment.carrierId?.toString() !== actor.id) {
    throw new HttpError(403, "forbidden", "Chỉ nhà xe của đơn này xác nhận đã nhận tiền.");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body) || Object.keys(body).length > 0) {
    throw new HttpError(400, "invalid_request", "Yêu cầu chứa trường không được phép.");
  }
  const confirmedAt = new Date();
  const updated = await FreightPayment.findOneAndUpdate(
    { shipmentId: shipment._id, carrierId: shipment.carrierId, status: "RECORDED" },
    { $set: { status: "CONFIRMED", confirmedBy: actor.id, confirmedAt } },
    { returnDocument: "after" },
  );
  if (!updated) {
    const existing = await FreightPayment.findOne({ shipmentId: shipment._id });
    if (existing?.status === "CONFIRMED") {
      throw new HttpError(409, "freight_already_confirmed", "Nhà xe đã xác nhận thanh toán này.");
    }
    throw new HttpError(409, "freight_not_recorded", "Chưa có khoản thanh toán để xác nhận.");
  }
  await recordOrderNotice({
    recipientId: shipment.shipperId.toString(),
    shipmentId: shipment._id.toString(),
    kind: "FREIGHT_CONFIRMED",
    title: "Nhà xe đã xác nhận đã nhận tiền",
    body: orderNoticeBody(shipment.cargoDescription, shipment.pickupLocation, shipment.deliveryLocation),
  });
  await recordSuccessfulAudit({
    action: "FREIGHT_PAYMENT_CONFIRMED",
    actorId: actor.id,
    actorRole: "CARRIER",
    resourceType: "shipment",
    resourceId: shipment._id.toString(),
    statusBefore: "RECORDED",
    statusAfter: "CONFIRMED",
    relatedCarrierId: actor.id,
  });
  return present(shipment, updated);
}

async function loadPartyShipment(shipmentId: string, actor: Actor) {
  if (!isValidObjectId(shipmentId)) throw new HttpError(404, "not_found", "Không tìm thấy chuyến này.");
  const shipment = await Shipment.findById(shipmentId);
  if (!shipment || !isParty(shipment, actor)) throw new HttpError(404, "not_found", "Không tìm thấy chuyến này.");
  return shipment;
}

function isParty(
  shipment: { shipperId: { toString(): string }; carrierId?: { toString(): string } | null; driverId?: { toString(): string } | null },
  actor: Actor,
): boolean {
  if (actor.role === "SHIPPER") return shipment.shipperId.toString() === actor.id;
  if (actor.role === "CARRIER") return shipment.carrierId?.toString() === actor.id;
  if (actor.role === "DRIVER") return shipment.driverId?.toString() === actor.id;
  return false;
}

function assertPayable(shipment: { status: string; listedPriceVnd: number }): void {
  if (shipment.status !== "DELIVERY_CONFIRMED" && shipment.status !== "COMPLETED") {
    throw new HttpError(409, "freight_not_open", "Chỉ ghi nhận thanh toán sau khi hàng đã giao.");
  }
  if (!Number.isInteger(shipment.listedPriceVnd) || shipment.listedPriceVnd < 1) {
    throw new HttpError(409, "freight_amount_invalid", "Cước niêm yết không ghi nhận được.");
  }
}

function readRecordBody(body: unknown): { method: FreightPaymentMethod; reference: string | null } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "invalid_request", "Chọn cách trả cước.");
  }
  const record = body as Record<string, unknown>;
  const allowed = new Set(["method", "reference"]);
  if (Object.keys(record).some((key) => !allowed.has(key))) {
    throw new HttpError(400, "invalid_request", "Yêu cầu chứa trường không được phép.");
  }
  if (record.method !== "BANK_TRANSFER" && record.method !== "CASH") {
    throw new HttpError(400, "invalid_request", "Chọn chuyển khoản hoặc tiền mặt.", {
      method: "Chọn chuyển khoản hoặc tiền mặt.",
    });
  }
  if (record.method === "CASH") {
    if ("reference" in record) throw new HttpError(400, "invalid_request", "Tiền mặt không cần mã giao dịch.");
    return { method: "CASH", reference: null };
  }
  const reference = typeof record.reference === "string" ? record.reference.trim() : "";
  if (!/^[A-Za-z0-9-]{4,40}$/.test(reference)) {
    throw new HttpError(400, "invalid_request", "Nhập mã giao dịch từ 4 đến 40 ký tự, chỉ chữ, số và dấu gạch ngang.", {
      reference: "Nhập mã giao dịch từ 4 đến 40 ký tự, chỉ chữ, số và dấu gạch ngang.",
    });
  }
  return { method: "BANK_TRANSFER", reference };
}

function present(
  shipment: { listedPriceVnd: number; status: string },
  row: StoredPayment | null,
): FreightPaymentView {
  const open = shipment.status === "DELIVERY_CONFIRMED" || shipment.status === "COMPLETED";
  if (!row) {
    return {
      status: "UNPAID",
      amountVnd: shipment.listedPriceVnd,
      method: null,
      methodLabel: null,
      reference: null,
      recordedAt: null,
      confirmedAt: null,
      platformCollected: false,
      label: open ? "Chưa ghi nhận thanh toán cước." : "Thanh toán cước mở sau khi giao hàng.",
    };
  }
  const method = row.method === "CASH" ? "CASH" : "BANK_TRANSFER";
  const confirmed = row.status === "CONFIRMED";
  return {
    status: confirmed ? "CONFIRMED" : "RECORDED",
    amountVnd: row.amountVnd,
    method,
    methodLabel: methodLabels[method],
    reference: row.reference ?? null,
    recordedAt: row.recordedAt.toISOString(),
    confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
    platformCollected: false,
    label: confirmed ? "Nhà xe đã xác nhận đã nhận tiền." : "Chủ hàng đã ghi nhận thanh toán. Chờ nhà xe xác nhận.",
  };
}

function isDuplicate(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === 11000;
}

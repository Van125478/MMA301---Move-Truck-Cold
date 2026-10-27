import { Router } from "express";
import { readCorrelationId, recordSuccessfulAudit } from "../audit/recordAudit.js";
import { isValidObjectId } from "mongoose";
import { claimDriverForAssignment, releaseDriverHold } from "../fleet/driverAccount.js";
import { quoteForAccount, readExpectedPlanVersion, rememberEstimated } from "../commission/record.js";
import { getEnv } from "../config/env.js";
import { assertCarrierMayClaim } from "../packages/entitlements.js";
import { releaseVehicleReservation, reserveVehicleForShipment, vehicleBusyMessage } from "../packages/vehicleLease.js";
import { activeVehicleFilter, unfinishedShipmentStatuses } from "../packages/vehicleStatus.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireOperationalSession } from "../middlewares/requireOperational.js";
import { requireTrustedOrigin } from "../middlewares/requireOrigin.js";
import { requireRole } from "../middlewares/requireRole.js";
import { Shipment } from "../models/shipment.js";
import { User } from "../models/user.js";
import { Vehicle } from "../models/vehicle.js";
import { readAssignInput } from "../shipments/assignInput.js";
import { toCarrierShipmentView, toCarrierShipmentViews } from "../shipments/assignmentView.js";
import { compareMarketplaceShipments, marketplaceFilter, readMarketplaceQuery } from "../shipments/marketplaceQuery.js";
import { toTrackingDto } from "../gps/trackingView.js";
import { attachTimeline, shipmentEventUpdate } from "../shipments/shipmentEvents.js";
import { orderNoticeBody, recordOrderNotice } from "../orders/notices.js";

const forbiddenFields = ["carrierId", "status", "shipperId", "vehicleId", "driverId", "role", "tenantId", "senderId", "rateBps", "calculatedFeeVnd", "planVersionId", "payerAccountId", "commission", "paymentCollected"] as const;

export const carrierShipmentRouter = Router();

carrierShipmentRouter.use(requireAuth, requireOperationalSession, requireRole("CARRIER"));

carrierShipmentRouter.get("/", async (request, response, next) => {
  try {
    const parsed = readMarketplaceQuery(request.query as Record<string, unknown>);
    const filter = marketplaceFilter(parsed);
    const total = await Shipment.countDocuments(filter);
    const matched = await Shipment.find(filter).limit(500);
    matched.sort(compareMarketplaceShipments(parsed.sort));
    const page = matched.slice(0, 100);
    response.status(200).json({
      shipments: await toCarrierShipmentViews(page),
      total,
      shown: page.length,
      truncated: total > matched.length,
    });
  } catch (error) {
    next(error);
  }
});

carrierShipmentRouter.get("/claimed", async (request, response, next) => {
  try {
    const carrierId = request.authUser?.id;
    if (!carrierId) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
    const shipments = await Shipment.find({
      carrierId,
      status: { $in: ["MATCHED", "IN_TRANSIT", "DELIVERY_CONFIRMED"] },
    }).sort({ createdAt: 1, _id: 1 });
    response.status(200).json({ shipments: await toCarrierShipmentViews(shipments) });
  } catch (error) {
    next(error);
  }
});

carrierShipmentRouter.get("/:id/location", async (request, response, next) => {
  try {
    const carrierId = request.authUser?.id;
    if (!carrierId) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
    const id = request.params.id;
    if (typeof id !== "string" || !isValidObjectId(id)) {
      throw new HttpError(404, "not_found", "Không tìm thấy chuyến này.");
    }
    const shipment = await Shipment.findById(id);
    if (!shipment || shipment.carrierId?.toString() !== carrierId) {
      throw new HttpError(404, "not_found", "Không tìm thấy chuyến này.");
    }
    response.status(200).json({ tracking: toTrackingDto(shipment.status, shipment.latestLocation) });
  } catch (error) {
    next(error);
  }
});

carrierShipmentRouter.get("/:id", async (request, response, next) => {
  try {
    const carrierId = request.authUser?.id;
    if (!carrierId) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
    const id = request.params.id;
    if (typeof id !== "string" || !isValidObjectId(id)) {
      throw new HttpError(404, "not_found", "Không tìm thấy chuyến này.");
    }
    const shipment = await Shipment.findById(id);
    const open = shipment?.status === "PUBLISHED" && shipment.carrierId == null;
    const owned = shipment?.carrierId?.toString() === carrierId;
    if (!shipment || (!open && !owned)) throw new HttpError(404, "not_found", "Không tìm thấy chuyến này.");
    response.status(200).json({ shipment: await attachTimeline(shipment, await toCarrierShipmentView(shipment), "carrier") });
  } catch (error) {
    next(error);
  }
});

carrierShipmentRouter.post("/:id/claim", requireTrustedOrigin, async (request, response, next) => {
  try {
    const carrierId = request.authUser?.id;
    if (!carrierId) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");

    const body: unknown = request.body;
    if (typeof body === "object" && body !== null) {
      const present = forbiddenFields.filter((field) => field in (body as Record<string, unknown>));
      if (present.length > 0) {
        throw new HttpError(400, "invalid_request", "Yêu cầu chứa trường không được phép.");
      }
    }

    const id = request.params.id;
    if (typeof id !== "string" || !isValidObjectId(id)) {
      throw new HttpError(404, "not_found", "Không tìm thấy đơn.");
    }

    const occurredAt = new Date();
    await assertCarrierMayClaim(carrierId, occurredAt);
    const expectedPlanVersionId = readExpectedPlanVersion(request.body);
    const openShipment = getEnv().commissionSimulationAllowed
      ? await Shipment.findById(id).select("listedPriceVnd")
      : null;
    const carrierSnapshot = openShipment
      ? await quoteForAccount(carrierId, openShipment.listedPriceVnd, expectedPlanVersionId)
      : null;
    const shipment = await Shipment.findOneAndUpdate(
      {
        _id: id,
        status: "PUBLISHED",
        $or: [{ carrierId: { $exists: false } }, { carrierId: null }],
      },
      shipmentEventUpdate(
        {
          status: "MATCHED",
          carrierId,
          ...(carrierSnapshot ? { "commission.carrier": carrierSnapshot, "commission.carrierStatus": "ESTIMATED" } : {}),
        },
        {
          type: "CLAIMED",
          occurredAt,
          actorId: carrierId,
          actorRole: "CARRIER",
          statusBefore: "PUBLISHED",
          statusAfter: "MATCHED",
        },
      ),
      { returnDocument: "after", updatePipeline: true },
    );
    if (!shipment) {
      const existing = await Shipment.findById(id);
      if (!existing) throw new HttpError(404, "not_found", "Không tìm thấy đơn.");
      throw new HttpError(409, "conflict", "Đơn này đã có nhà xe nhận. Chuyến không còn mở.");
    }
    if (carrierSnapshot) await rememberEstimated(shipment._id.toString(), carrierSnapshot);

    const claimedBody = orderNoticeBody(shipment.cargoDescription, shipment.pickupLocation, shipment.deliveryLocation);
    await recordOrderNotice({
      recipientId: shipment.shipperId.toString(),
      shipmentId: shipment._id.toString(),
      kind: "CLAIMED",
      title: "Đơn đã được nhận",
      body: claimedBody,
    });
    await recordOrderNotice({
      recipientId: carrierId,
      shipmentId: shipment._id.toString(),
      kind: "CLAIMED",
      title: "Bạn đã nhận chuyến",
      body: claimedBody,
    });

    await recordSuccessfulAudit({
      action: "SHIPMENT_CLAIMED",
      actorId: carrierId,
      actorRole: "CARRIER",
      resourceType: "shipment",
      resourceId: shipment._id.toString(),
      statusBefore: "PUBLISHED",
      statusAfter: "MATCHED",
      relatedCarrierId: carrierId,
      correlationId: readCorrelationId(request.headers["x-request-id"]),
    });
    response.status(200).json({ shipment: await attachTimeline(shipment, await toCarrierShipmentView(shipment), "carrier") });
  } catch (error) {
    next(error);
  }
});

carrierShipmentRouter.post("/:id/assign", requireTrustedOrigin, async (request, response, next) => {
  try {
    const carrierId = request.authUser?.id;
    if (!carrierId) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
    const input = readAssignInput(request.body);
    const id = request.params.id;
    if (typeof id !== "string" || !isValidObjectId(id)) {
      throw new HttpError(404, "not_found", "Không tìm thấy đơn.");
    }

    const driver = await User.findOne({ _id: input.driverId, role: "DRIVER", carrierId }).select("displayName");
    const archivedVehicle = await Vehicle.findOne({ _id: input.vehicleId, carrierId, status: "ARCHIVED" }).select("_id");
    if (archivedVehicle) {
      throw new HttpError(409, "vehicle_archived", "Xe đã lưu trữ không được phân công cho chuyến mới.");
    }
    const vehicle = await Vehicle.findOne({ _id: input.vehicleId, carrierId, ...activeVehicleFilter() }).select("label status");
    if (!vehicle || !driver) {
      throw new HttpError(400, "invalid_request", "Xe hoặc tài xế không thuộc nhà xe này.");
    }
    const existingShipment = await Shipment.findById(id).select("carrierId status vehicleId driverId");
    if (!existingShipment) throw new HttpError(404, "not_found", "Không tìm thấy đơn.");
    if (existingShipment.carrierId?.toString() !== carrierId) {
      throw new HttpError(403, "forbidden", "Nhà xe này không phụ trách chuyến.");
    }
    if (existingShipment.vehicleId || existingShipment.driverId) {
      throw new HttpError(409, "conflict", "Chuyến này đã được phân công.");
    }
    if (existingShipment.status !== "MATCHED") {
      throw new HttpError(409, "conflict", "Chuyến chưa sẵn sàng để phân công.");
    }
    const alreadyOnTrip = await Shipment.exists({
      _id: { $ne: id },
      vehicleId: input.vehicleId,
      status: { $in: [...unfinishedShipmentStatuses] },
    });
    if (alreadyOnTrip) {
      throw new HttpError(409, "vehicle_busy", vehicleBusyMessage);
    }

    const reserved = await reserveVehicleForShipment(carrierId, input.vehicleId, id);
    if (!reserved) {
      const current = await Vehicle.findOne({ _id: input.vehicleId, carrierId }).select("status");
      if (current?.status === "ARCHIVED") {
        throw new HttpError(409, "vehicle_archived", "Xe đã lưu trữ không được phân công cho chuyến mới.");
      }
      if (!current) throw new HttpError(400, "invalid_request", "Xe hoặc tài xế không thuộc nhà xe này.");
      throw new HttpError(409, "vehicle_busy", vehicleBusyMessage);
    }

    const claim = await claimDriverForAssignment(input.driverId, carrierId, id);
    if (claim !== "claimed") {
      await releaseVehicleReservation(carrierId, input.vehicleId, id);
      throw new HttpError(409, "conflict", "Tài xế chưa thể nhận chuyến.");
    }

    const occurredAt = new Date();
    let shipment;
    try {
      shipment = await Shipment.findOneAndUpdate(
        {
          _id: id,
          carrierId,
          status: "MATCHED",
          $and: [
            { $or: [{ vehicleId: { $exists: false } }, { vehicleId: null }] },
            { $or: [{ driverId: { $exists: false } }, { driverId: null }] },
          ],
        },
        shipmentEventUpdate(
          { vehicleId: input.vehicleId, driverId: input.driverId },
          {
            type: "ASSIGNED",
            occurredAt,
            actorId: carrierId,
            actorRole: "CARRIER",
            statusBefore: "MATCHED",
            statusAfter: "MATCHED",
            vehicleId: input.vehicleId,
            driverId: input.driverId,
            assignedVehicleLabel: reserved.label.trim(),
            ...(driver.displayName?.trim() ? { assignedDriverName: driver.displayName.trim() } : {}),
          },
        ),
        { returnDocument: "after", updatePipeline: true },
      );
    } catch (error) {
      await releaseReservationUnlessAssigned(carrierId, input.vehicleId, input.driverId, id);
      throw error;
    }
    if (!shipment) {
      const existing = await Shipment.findById(id);
      const keptReservation = existing?.vehicleId?.toString() === input.vehicleId && existing.status !== "DELIVERY_CONFIRMED" && existing.status !== "COMPLETED" && existing.status !== "CANCELLED";
      if (!keptReservation) await releaseVehicleReservation(carrierId, input.vehicleId, id);
      if (existing?.driverId?.toString() !== input.driverId) await releaseDriverHold(input.driverId, id);
      if (!existing) throw new HttpError(404, "not_found", "Không tìm thấy đơn.");
      if (existing.carrierId?.toString() !== carrierId) {
        throw new HttpError(403, "forbidden", "Nhà xe này không phụ trách chuyến.");
      }
      if (existing.vehicleId || existing.driverId) {
        throw new HttpError(409, "conflict", "Chuyến này đã được phân công.");
      }
      throw new HttpError(409, "conflict", "Chuyến chưa sẵn sàng để phân công.");
    }

    await recordOrderNotice({
      recipientId: input.driverId,
      shipmentId: shipment._id.toString(),
      kind: "ASSIGNED",
      title: "Bạn được giao chuyến",
      body: orderNoticeBody(shipment.cargoDescription, shipment.pickupLocation, shipment.deliveryLocation),
    });

    await recordSuccessfulAudit({
      action: "SHIPMENT_ASSIGNED",
      actorId: carrierId,
      actorRole: "CARRIER",
      resourceType: "shipment",
      resourceId: shipment._id.toString(),
      statusBefore: "MATCHED",
      statusAfter: "MATCHED",
      relatedCarrierId: carrierId,
      correlationId: readCorrelationId(request.headers["x-request-id"]),
    });
    response.status(200).json({ shipment: await attachTimeline(shipment, await toCarrierShipmentView(shipment), "carrier") });
  } catch (error) {
    next(error);
  }
});

const endedAssignment = new Set<string>(["DELIVERY_CONFIRMED", "COMPLETED", "CANCELLED"]);

async function releaseReservationUnlessAssigned(carrierId: string, vehicleId: string, driverId: string, shipmentId: string): Promise<void> {
  let existing;
  try {
    existing = await Shipment.findById(shipmentId).select("vehicleId driverId status");
  } catch {
    return;
  }
  const keepsVehicle = existing?.vehicleId?.toString() === vehicleId && !endedAssignment.has(existing.status);
  if (keepsVehicle) {
    if (existing?.driverId?.toString() !== driverId) await releaseDriverHold(driverId, shipmentId);
    return;
  }
  if (existing?.driverId?.toString() !== driverId) await releaseDriverHold(driverId, shipmentId);
  await releaseVehicleReservation(carrierId, vehicleId, shipmentId);
}

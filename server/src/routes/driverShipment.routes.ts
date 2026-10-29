import { Router } from "express";
import { readCorrelationId, recordSuccessfulAudit } from "../audit/recordAudit.js";
import { isValidObjectId } from "mongoose";
import { HttpError } from "../middlewares/errorHandler.js";
import { accrueDeliveredShipment } from "../commission/record.js";
import { getEnv } from "../config/env.js";
import { releaseDriverHold } from "../fleet/driverAccount.js";
import { releaseVehicleReservation } from "../packages/vehicleLease.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireOperationalSession } from "../middlewares/requireOperational.js";
import { requireTrustedOrigin } from "../middlewares/requireOrigin.js";
import { requireRole } from "../middlewares/requireRole.js";
import { readLocationSample } from "../gps/locationInput.js";
import { locationUpdate, toTrackingDto } from "../gps/trackingView.js";
import { Shipment } from "../models/shipment.js";
import { toCarrierShipmentViews } from "../shipments/assignmentView.js";
import { attachTimeline, shipmentEventUpdate } from "../shipments/shipmentEvents.js";
import type { CarrierShipmentDto, ShipmentRecord } from "../shipments/shipmentDto.js";

const forbiddenFields = ["driverId", "carrierId", "status", "shipperId", "vehicleId", "role", "tenantId", "senderId", "rateBps", "calculatedFeeVnd", "planVersionId", "payerAccountId", "commission", "paymentCollected", "listedPriceVnd"] as const;
const visibleStatuses = ["MATCHED", "IN_TRANSIT", "DELIVERY_CONFIRMED", "CANCELLED"] as const;

export type DriverShipmentDto = CarrierShipmentDto & {
  nextAction: "pickup" | "delivery" | "none";
};

export const driverShipmentRouter = Router();

driverShipmentRouter.use(requireAuth, requireOperationalSession, requireRole("DRIVER"));

driverShipmentRouter.get("/", async (request, response, next) => {
  try {
    const driverId = request.authUser?.id;
    if (!driverId) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
    const shipments = await Shipment.find(assignedFilter(driverId)).sort({ createdAt: 1, _id: 1 });
    response.status(200).json({ shipments: await present(shipments) });
  } catch (error) {
    next(error);
  }
});

driverShipmentRouter.get("/:id", async (request, response, next) => {
  try {
    const driverId = request.authUser?.id;
    if (!driverId) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
    const shipment = await findAssigned(driverId, routeId(request.params.id));
    response.status(200).json({ shipment: await presentOne(shipment) });
  } catch (error) {
    next(error);
  }
});

driverShipmentRouter.get("/:id/location", async (request, response, next) => {
  try {
    const driverId = request.authUser?.id;
    if (!driverId) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
    const shipment = await findAssigned(driverId, routeId(request.params.id));
    response.status(200).json({ tracking: toTrackingDto(shipment.status, shipment.latestLocation) });
  } catch (error) {
    next(error);
  }
});

driverShipmentRouter.post("/:id/location", requireTrustedOrigin, async (request, response, next) => {
  try {
    const driverId = request.authUser?.id;
    if (!driverId) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
    const id = routeId(request.params.id);
    const sample = readLocationSample(request.body);
    const receivedAt = new Date();
    const updated = await Shipment.findOneAndUpdate(
      { _id: id, driverId, status: "IN_TRANSIT" },
      locationUpdate(driverId, sample, receivedAt),
      { returnDocument: "after", updatePipeline: true },
    );
    if (!updated) {
      const current = await Shipment.findById(id);
      if (!current || current.driverId?.toString() !== driverId) {
        throw new HttpError(404, "not_found", "Không tìm thấy chuyến này.");
      }
      throw new HttpError(409, "conflict", "Chuyến không còn nhận vị trí GPS.");
    }
    const accepted = updated.latestLocation?.receivedAt?.getTime() === receivedAt.getTime();
    if (!accepted) {
      throw new HttpError(409, "conflict", "Vị trí gửi đến không mới hơn vị trí đã lưu.");
    }
    response.status(200).json({ tracking: toTrackingDto(updated.status, updated.latestLocation) });
  } catch (error) {
    next(error);
  }
});

driverShipmentRouter.post("/:id/pickup", requireTrustedOrigin, async (request, response, next) => {
  try {
    rejectForbiddenBody(request.body);
    const driverId = request.authUser?.id;
    if (!driverId) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
    const id = routeId(request.params.id);
    const confirmedAt = new Date();
    const updated = await Shipment.findOneAndUpdate(
      {
        _id: id,
        driverId,
        vehicleId: { $ne: null },
        status: "MATCHED",
        $or: [{ pickupConfirmedAt: { $exists: false } }, { pickupConfirmedAt: null }],
      },
      shipmentEventUpdate(
        { status: "IN_TRANSIT", pickupConfirmedAt: confirmedAt, pickupConfirmedBy: driverId },
        {
          type: "PICKUP_CONFIRMED",
          occurredAt: confirmedAt,
          actorId: driverId,
          actorRole: "DRIVER",
          statusBefore: "MATCHED",
          statusAfter: "IN_TRANSIT",
        },
      ),
      { returnDocument: "after", updatePipeline: true },
    );
    const shipment = updated ?? (await currentForDriver(driverId, id));
    if (!shipment.pickupConfirmedAt) {
      throw new HttpError(409, "conflict", "Chuyến chưa sẵn sàng để xác nhận lấy hàng.");
    }
    if (updated) {
      await recordSuccessfulAudit({
        action: "SHIPMENT_PICKUP_CONFIRMED",
        actorId: driverId,
        actorRole: "DRIVER",
        resourceType: "shipment",
        resourceId: shipment._id.toString(),
        statusBefore: "MATCHED",
        statusAfter: "IN_TRANSIT",
        ...(shipment.carrierId ? { relatedCarrierId: shipment.carrierId.toString() } : {}),
        correlationId: readCorrelationId(request.headers["x-request-id"]),
      });
    }
    response.status(200).json({ shipment: await presentOne(shipment) });
  } catch (error) {
    next(error);
  }
});

driverShipmentRouter.post("/:id/delivery", requireTrustedOrigin, async (request, response, next) => {
  try {
    rejectForbiddenBody(request.body);
    const driverId = request.authUser?.id;
    if (!driverId) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
    const id = routeId(request.params.id);
    const confirmedAt = new Date();
    const deliveryUpdate = shipmentEventUpdate(
      { status: "DELIVERY_CONFIRMED", deliveryConfirmedAt: confirmedAt, deliveryConfirmedBy: driverId },
      {
        type: "DELIVERY_CONFIRMED",
        occurredAt: confirmedAt,
        actorId: driverId,
        actorRole: "DRIVER",
        statusBefore: "IN_TRANSIT",
        statusAfter: "DELIVERY_CONFIRMED",
      },
    );
    if (getEnv().commissionSimulationAllowed) {
      deliveryUpdate.push({
        $set: {
          "commission.outbox.status": {
            $cond: [
              {
                $or: [
                  { $eq: [{ $type: "$commission.shipper" }, "object"] },
                  { $eq: [{ $type: "$commission.carrier" }, "object"] },
                ],
              },
              "PENDING",
              "$$REMOVE",
            ],
          },
        },
      });
    }
    const updated = await Shipment.findOneAndUpdate(
      {
        _id: id,
        driverId,
        status: "IN_TRANSIT",
        pickupConfirmedAt: { $ne: null },
        $or: [{ deliveryConfirmedAt: { $exists: false } }, { deliveryConfirmedAt: null }],
      },
      deliveryUpdate,
      { returnDocument: "after", updatePipeline: true },
    );
    const shipment = updated ?? (await currentForDriver(driverId, id));
    if (shipment.status === "MATCHED" || shipment.pickupConfirmedAt == null) {
      throw new HttpError(409, "conflict", "Chưa xác nhận lấy hàng.");
    }
    if (shipment.status !== "DELIVERY_CONFIRMED" || shipment.deliveryConfirmedAt == null) {
      throw new HttpError(409, "conflict", "Chuyến chưa sẵn sàng để xác nhận giao hàng.");
    }
    await releaseDriverHold(driverId, id);
    if (shipment.vehicleId && shipment.carrierId) {
      await releaseVehicleReservation(shipment.carrierId.toString(), shipment.vehicleId.toString(), id);
    }
    if (getEnv().commissionSimulationAllowed) await accrueDeliveredShipment(id);
    if (updated) {
      await recordSuccessfulAudit({
        action: "SHIPMENT_DELIVERY_CONFIRMED",
        actorId: driverId,
        actorRole: "DRIVER",
        resourceType: "shipment",
        resourceId: shipment._id.toString(),
        statusBefore: "IN_TRANSIT",
        statusAfter: "DELIVERY_CONFIRMED",
        ...(shipment.carrierId ? { relatedCarrierId: shipment.carrierId.toString() } : {}),
        correlationId: readCorrelationId(request.headers["x-request-id"]),
      });
    }
    response.status(200).json({ shipment: await presentOne(shipment) });
  } catch (error) {
    next(error);
  }
});

function routeId(value: string | string[] | undefined): string {
  const id = Array.isArray(value) ? value[0] : value;
  if (!id || !isValidObjectId(id)) throw new HttpError(404, "not_found", "Không tìm thấy chuyến này.");
  return id;
}

function assignedFilter(driverId: string) {
  return {
    driverId,
    vehicleId: { $ne: null },
    status: { $in: visibleStatuses },
  };
}

async function findAssigned(driverId: string, id: string) {
  const shipment = await Shipment.findOne({ _id: id, ...assignedFilter(driverId) });
  if (!shipment) throw new HttpError(404, "not_found", "Không tìm thấy chuyến này.");
  return shipment;
}

async function currentForDriver(driverId: string, id: string) {
  const shipment = await Shipment.findById(id);
  if (!shipment || shipment.driverId?.toString() !== driverId) {
    throw new HttpError(404, "not_found", "Không tìm thấy chuyến này.");
  }
  return shipment;
}

function rejectForbiddenBody(body: unknown) {
  if (typeof body !== "object" || body === null) return;
  const present = forbiddenFields.filter((field) => field in (body as Record<string, unknown>));
  if (present.length > 0) throw new HttpError(400, "invalid_request", "Yêu cầu chứa trường không được phép.");
}

async function presentOne(shipment: ShipmentRecord): Promise<DriverShipmentDto> {
  const [view] = await present([shipment]);
  if (!view) throw new HttpError(404, "not_found", "Không tìm thấy chuyến này.");
  return attachTimeline(shipment, view, "driver");
}

async function present(shipments: readonly ShipmentRecord[]): Promise<DriverShipmentDto[]> {
  const views = await toCarrierShipmentViews(shipments);
  return views.map((view) => ({
    ...view,
    nextAction: view.status === "MATCHED" ? "pickup" : view.status === "IN_TRANSIT" ? "delivery" : "none",
  }));
}

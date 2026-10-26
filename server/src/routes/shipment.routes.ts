import { Router } from "express";
import { readCorrelationId, recordSuccessfulAudit } from "../audit/recordAudit.js";
import { isValidObjectId } from "mongoose";
import { voidEstimated } from "../commission/lifecycle.js";
import { quoteForAccount, readExpectedPlanVersion, rememberEstimated } from "../commission/record.js";
import { getEnv } from "../config/env.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireOperationalSession } from "../middlewares/requireOperational.js";
import { requireTrustedOrigin } from "../middlewares/requireOrigin.js";
import { requireRole } from "../middlewares/requireRole.js";
import { Shipment } from "../models/shipment.js";
import { toShipmentView, toShipmentViews } from "../shipments/assignmentView.js";
import { toTrackingDto } from "../gps/trackingView.js";
import { attachTimeline, shipmentEventUpdate } from "../shipments/shipmentEvents.js";
import { attachReservedCargoImages, releaseCargoReservation, reserveCargoImages } from "../shipments/cargoImages.js";
import { readPublishInput } from "../shipments/publishInput.js";

export const shipmentRouter = Router();

shipmentRouter.use(requireAuth, requireOperationalSession, requireRole("SHIPPER"));

shipmentRouter.post("/", requireTrustedOrigin, async (request, response, next) => {
  try {
    const expectedPlanVersionId = readExpectedPlanVersion(request.body);
    const input = readPublishInput(request.body);
    const shipperId = request.authUser?.id;
    if (!shipperId) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
    const reserved = await reserveCargoImages(shipperId, request.body);
    const occurredAt = new Date();
    const shipperSnapshot = getEnv().commissionSimulationAllowed
      ? await quoteForAccount(shipperId, input.listedPriceVnd, expectedPlanVersionId)
      : null;
    const shipment = await (async () => {
      try {
        const created = await Shipment.create({
          ...input,
          cargoImageIds: reserved.ids,
          shipperId,
          status: "PUBLISHED",
          ...(shipperSnapshot
            ? { commission: { shipper: shipperSnapshot, shipperStatus: "ESTIMATED", carrierStatus: "ABSENT" } }
            : {}),
          events: [
            {
              type: "PUBLISHED",
              occurredAt,
              actorId: shipperId,
              actorRole: "SHIPPER",
              statusAfter: "PUBLISHED",
              sequence: 1,
            },
          ],
        });
        try {
          await attachReservedCargoImages(shipperId, created._id, reserved.token, reserved.ids);
          return created;
        } catch (error) {
          await Shipment.deleteOne({ _id: created._id });
          throw error;
        }
      } catch (error) {
        await releaseCargoReservation(shipperId, reserved.token);
        throw error;
      }
    })();
    if (shipperSnapshot) await rememberEstimated(shipment._id.toString(), shipperSnapshot);
    await recordSuccessfulAudit({
      action: "SHIPMENT_PUBLISHED",
      actorId: shipperId,
      actorRole: "SHIPPER",
      resourceType: "shipment",
      resourceId: shipment._id.toString(),
      statusAfter: "PUBLISHED",
      correlationId: readCorrelationId(request.headers["x-request-id"]),
    });
    response.status(201).json({ shipment: await attachTimeline(shipment, await toShipmentView(shipment), "shipper") });
  } catch (error) {
    next(error);
  }
});

shipmentRouter.get("/mine", async (request, response, next) => {
  try {
    const shipperId = request.authUser?.id;
    if (!shipperId) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
    const shipments = await Shipment.find({ shipperId }).sort({ createdAt: -1 });
    response.status(200).json({ shipments: await toShipmentViews(shipments) });
  } catch (error) {
    next(error);
  }
});

shipmentRouter.get("/:id/location", async (request, response, next) => {
  try {
    const id = request.params.id;
    if (typeof id !== "string" || !isValidObjectId(id)) {
      throw new HttpError(404, "not_found", "Không tìm thấy đơn.");
    }
    const shipment = await Shipment.findById(id);
    if (!shipment) throw new HttpError(404, "not_found", "Không tìm thấy đơn.");
    if (shipment.shipperId.toString() !== request.authUser?.id) {
      throw new HttpError(403, "forbidden", "Tài khoản này không có quyền xem đơn.");
    }
    response.status(200).json({ tracking: toTrackingDto(shipment.status, shipment.latestLocation) });
  } catch (error) {
    next(error);
  }
});

shipmentRouter.get("/:id", async (request, response, next) => {
  try {
    const id = request.params.id;
    if (typeof id !== "string" || !isValidObjectId(id)) {
      throw new HttpError(404, "not_found", "Không tìm thấy đơn.");
    }
    const shipment = await Shipment.findById(id);
    if (!shipment) throw new HttpError(404, "not_found", "Không tìm thấy đơn.");
    if (shipment.shipperId.toString() !== request.authUser?.id) {
      throw new HttpError(403, "forbidden", "Tài khoản này không có quyền xem đơn.");
    }
    response.status(200).json({ shipment: await attachTimeline(shipment, await toShipmentView(shipment), "shipper") });
  } catch (error) {
    next(error);
  }
});

shipmentRouter.post("/:id/cancel", requireTrustedOrigin, async (request, response, next) => {
  try {
    const shipperId = request.authUser?.id;
    if (!shipperId) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
    const body: unknown = request.body;
    if (typeof body === "object" && body !== null && !Array.isArray(body) && Object.keys(body).length > 0) {
      throw new HttpError(400, "invalid_request", "Yêu cầu hủy không nhận thêm trường.");
    }
    if (body !== undefined && (typeof body !== "object" || body === null || Array.isArray(body))) {
      throw new HttpError(400, "invalid_request", "Yêu cầu hủy không nhận thêm trường.");
    }

    const id = request.params.id;
    if (typeof id !== "string" || !isValidObjectId(id)) {
      throw new HttpError(404, "not_found", "Không tìm thấy đơn.");
    }

    const occurredAt = new Date();
    const shipment = await Shipment.findOneAndUpdate(
      { _id: id, shipperId, status: "PUBLISHED" },
      shipmentEventUpdate(
        { status: "CANCELLED" },
        {
          type: "CANCELLED",
          occurredAt,
          actorId: shipperId,
          actorRole: "SHIPPER",
          statusBefore: "PUBLISHED",
          statusAfter: "CANCELLED",
        },
      ),
      { returnDocument: "after", updatePipeline: true },
    );
    if (!shipment) {
      const existing = await Shipment.findById(id);
      if (!existing) throw new HttpError(404, "not_found", "Không tìm thấy đơn.");
      if (existing.shipperId.toString() !== shipperId) {
        throw new HttpError(403, "forbidden", "Tài khoản này không có quyền hủy đơn.");
      }
      throw new HttpError(409, "conflict", "Chỉ hủy được đơn đang tìm xe. Đơn đã có nhà xe nhận thì chưa mở hủy.");
    }

    const shipperCommission = shipment.commission?.shipperStatus;
    if (shipperCommission === "ESTIMATED") {
      const voided = voidEstimated(shipperCommission);
      await Shipment.updateOne(
        { _id: shipment._id, status: "CANCELLED", "commission.shipperStatus": "ESTIMATED" },
        { $set: { "commission.shipperStatus": voided } },
      );
      if (shipment.commission) shipment.commission.shipperStatus = voided;
    }

    await recordSuccessfulAudit({
      action: "SHIPMENT_CANCELLED",
      actorId: shipperId,
      actorRole: "SHIPPER",
      resourceType: "shipment",
      resourceId: shipment._id.toString(),
      statusBefore: "PUBLISHED",
      statusAfter: "CANCELLED",
      correlationId: readCorrelationId(request.headers["x-request-id"]),
    });
    response.status(200).json({ shipment: await attachTimeline(shipment, await toShipmentView(shipment), "shipper") });
  } catch (error) {
    next(error);
  }
});

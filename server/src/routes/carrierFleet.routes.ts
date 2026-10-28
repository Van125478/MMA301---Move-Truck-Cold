import { Router } from "express";
import { readCorrelationId, recordSuccessfulAudit } from "../audit/recordAudit.js";
import { isValidObjectId } from "mongoose";
import { createDriverAccount, lockDriverAccount, resetDriverPassword, toDriverRosterDto, unlockDriverAccount } from "../fleet/driverAccount.js";
import { readDriverName, readVehicleInput, temperatureLabel, vehicleKindLabel } from "../fleet/vehicleInput.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireOperationalSession } from "../middlewares/requireOperational.js";
import { requireTrustedOrigin } from "../middlewares/requireOrigin.js";
import { requireRole } from "../middlewares/requireRole.js";
import { Shipment, type TemperatureGroup } from "../models/shipment.js";
import { User } from "../models/user.js";
import { Vehicle, type VehicleKind, type VehicleStatus } from "../models/vehicle.js";
import { resolveAccountEntitlements } from "../packages/entitlements.js";
import { releaseActiveVehicleReservation, releaseCommittedVehicleSlot, reserveActiveVehicleSlot, settleReservedVehicle } from "../packages/fleetCapacity.js";
import { activeVehicleFilter, unfinishedShipmentStatuses } from "../packages/vehicleStatus.js";

export const carrierFleetRouter = Router();

carrierFleetRouter.use(requireAuth, requireOperationalSession, requireRole("CARRIER"));

carrierFleetRouter.get("/vehicles", async (request, response, next) => {
  try {
    const carrierId = carrier(request.authUser?.id);
    const vehicles = await Vehicle.find({ carrierId }).sort({ label: 1, _id: 1 });
    const blocked = await unfinishedVehicleIds(carrierId, vehicles.map((vehicle) => vehicle._id.toString()));
    response.status(200).json({
      vehicles: vehicles.map((vehicle) => toVehicleDto(vehicle, blocked.has(vehicle._id.toString()) || (vehicle.leasedShipmentIds?.length ?? 0) > 0)),
    });
  } catch (error) {
    next(error);
  }
});

carrierFleetRouter.post("/vehicles", requireTrustedOrigin, async (request, response, next) => {
  try {
    const carrierId = carrier(request.authUser?.id);
    const input = readVehicleInput(request.body);
    const entitlements = await resolveAccountEntitlements(carrierId);
    if (entitlements.vehicleCap == null) {
      throw new HttpError(409, "plan_limit_exceeded", "Gói hiện tại không có hạn mức xe.");
    }
    const reservation = await reserveActiveVehicleSlot(carrierId, entitlements.vehicleCap);
    let vehicle;
    try {
      vehicle = await Vehicle.create({ ...input, carrierId, status: "ACTIVE", statusChangedAt: new Date() });
    } catch (error) {
      await releaseActiveVehicleReservation(carrierId, reservation);
      throw error;
    }
    await settleReservedVehicle(carrierId, reservation, entitlements.vehicleCap, vehicle.id, "delete");
    await recordSuccessfulAudit({
      action: "VEHICLE_CREATED",
      actorId: carrierId,
      actorRole: "CARRIER",
      resourceType: "vehicle",
      resourceId: vehicle._id.toString(),
      relatedCarrierId: carrierId,
      fields: Object.keys(input),
      correlationId: readCorrelationId(request.headers["x-request-id"]),
    });
    response.status(201).json({ vehicle: toVehicleDto(vehicle, false) });
  } catch (error) {
    next(error);
  }
});

carrierFleetRouter.get("/vehicles/:id", async (request, response, next) => {
  try {
    const carrierId = carrier(request.authUser?.id);
    const vehicle = await ownedVehicle(carrierId, request.params.id);
    const blocked = await unfinishedVehicleIds(carrierId, [vehicle._id.toString()]);
    response.status(200).json({ vehicle: toVehicleDto(vehicle, blocked.has(vehicle._id.toString()) || (vehicle.leasedShipmentIds?.length ?? 0) > 0) });
  } catch (error) {
    next(error);
  }
});

carrierFleetRouter.patch("/vehicles/:id", requireTrustedOrigin, async (request, response, next) => {
  try {
    const carrierId = carrier(request.authUser?.id);
    const input = readVehicleInput(request.body);
    const updated = await Vehicle.findOneAndUpdate({ _id: routeId(request.params.id), carrierId }, input, { returnDocument: "after" });
    if (!updated) throw new HttpError(404, "not_found", "Không tìm thấy xe này.");
    const blocked = await unfinishedVehicleIds(carrierId, [updated._id.toString()]);
    await recordSuccessfulAudit({
      action: "VEHICLE_UPDATED",
      actorId: carrierId,
      actorRole: "CARRIER",
      resourceType: "vehicle",
      resourceId: updated._id.toString(),
      relatedCarrierId: carrierId,
      fields: Object.keys(input),
      correlationId: readCorrelationId(request.headers["x-request-id"]),
    });
    response.status(200).json({
      vehicle: toVehicleDto(updated, blocked.has(updated._id.toString()) || (updated.leasedShipmentIds?.length ?? 0) > 0),
    });
  } catch (error) {
    next(error);
  }
});

carrierFleetRouter.post("/vehicles/:id/archive", requireTrustedOrigin, async (request, response, next) => {
  try {
    rejectDriverCommand(request.body);
    const carrierId = carrier(request.authUser?.id);
    const id = routeId(request.params.id);
    const unfinished = await Shipment.exists({ carrierId, vehicleId: id, status: { $in: [...unfinishedShipmentStatuses] } });
    if (unfinished) {
      throw new HttpError(409, "vehicle_on_unfinished_trip", "Không lưu trữ xe đang gắn với chuyến chưa kết thúc.");
    }
    const archivedAt = new Date();
    const updated = await Vehicle.findOneAndUpdate(
      {
        _id: id,
        carrierId,
        ...activeVehicleFilter(),
        $or: [{ leasedShipmentIds: { $exists: false } }, { leasedShipmentIds: { $size: 0 } }],
      },
      { status: "ARCHIVED", archivedAt, statusChangedAt: archivedAt },
      { returnDocument: "after" },
    );
    if (!updated) {
      const current = await Vehicle.findOne({ _id: id, carrierId }).select("status leasedShipmentIds");
      if ((current?.leasedShipmentIds?.length ?? 0) > 0) {
        throw new HttpError(409, "vehicle_on_unfinished_trip", "Xe đang được giữ cho một chuyến. Không lưu trữ xe đang gắn với chuyến chưa kết thúc.");
      }
      throw new HttpError(404, "not_found", "Không tìm thấy xe đang hoạt động để lưu trữ.");
    }
    const assignedDuringArchive = await Shipment.exists({ carrierId, vehicleId: id, status: { $in: [...unfinishedShipmentStatuses] } });
    if (assignedDuringArchive) {
      await Vehicle.updateOne({ _id: id, carrierId, status: "ARCHIVED" }, { status: "ACTIVE", statusChangedAt: new Date(), archivedAt: null });
      throw new HttpError(409, "vehicle_on_unfinished_trip", "Xe vừa được phân công. Không lưu trữ xe đang gắn với chuyến chưa kết thúc.");
    }
    await releaseCommittedVehicleSlot(carrierId);
    await recordSuccessfulAudit({
      action: "VEHICLE_ARCHIVED",
      actorId: carrierId,
      actorRole: "CARRIER",
      resourceType: "vehicle",
      resourceId: updated._id.toString(),
      statusBefore: "ACTIVE",
      statusAfter: "ARCHIVED",
      relatedCarrierId: carrierId,
      correlationId: readCorrelationId(request.headers["x-request-id"]),
    });
    response.status(200).json({ vehicle: toVehicleDto(updated, false) });
  } catch (error) {
    next(error);
  }
});

carrierFleetRouter.post("/vehicles/:id/restore", requireTrustedOrigin, async (request, response, next) => {
  try {
    rejectDriverCommand(request.body);
    const carrierId = carrier(request.authUser?.id);
    const id = routeId(request.params.id);
    const entitlements = await resolveAccountEntitlements(carrierId);
    if (entitlements.vehicleCap == null) throw new HttpError(409, "plan_limit_exceeded", "Gói hiện tại không có hạn mức xe.");
    const reservation = await reserveActiveVehicleSlot(carrierId, entitlements.vehicleCap);
    const restoredAt = new Date();
    const updated = await Vehicle.findOneAndUpdate(
      { _id: id, carrierId, status: "ARCHIVED" },
      { status: "ACTIVE", restoredAt, statusChangedAt: restoredAt },
      { returnDocument: "after" },
    );
    if (!updated) {
      await releaseActiveVehicleReservation(carrierId, reservation);
      throw new HttpError(404, "not_found", "Không tìm thấy xe đã lưu trữ để khôi phục.");
    }
    await settleReservedVehicle(carrierId, reservation, entitlements.vehicleCap, updated.id, "archive");
    await recordSuccessfulAudit({
      action: "VEHICLE_RESTORED",
      actorId: carrierId,
      actorRole: "CARRIER",
      resourceType: "vehicle",
      resourceId: updated._id.toString(),
      statusBefore: "ARCHIVED",
      statusAfter: "ACTIVE",
      relatedCarrierId: carrierId,
      correlationId: readCorrelationId(request.headers["x-request-id"]),
    });
    response.status(200).json({ vehicle: toVehicleDto(updated, false) });
  } catch (error) {
    next(error);
  }
});

carrierFleetRouter.get("/drivers", async (request, response, next) => {
  try {
    const carrierId = carrier(request.authUser?.id);
    const drivers = await User.find({ role: "DRIVER", carrierId }).sort({ displayName: 1, _id: 1 }).select("email username displayName accountStatus mustChangePassword");
    const busy = await unfinishedDriverIds(carrierId, drivers.map((driver) => driver._id.toString()));
    response.status(200).json({
      drivers: drivers.map((driver) => toDriverRosterDto(driver, busy.has(driver._id.toString()))),
    });
  } catch (error) {
    next(error);
  }
});

carrierFleetRouter.post("/drivers", requireTrustedOrigin, async (request, response, next) => {
  try {
    const created = await createDriverAccount(carrier(request.authUser?.id), request.body, request.headers["x-request-id"]);
    response.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

carrierFleetRouter.get("/drivers/:id", async (request, response, next) => {
  try {
    const driver = await linkedDriver(carrier(request.authUser?.id), request.params.id);
    response.status(200).json({ driver: toDriverRosterDto(driver) });
  } catch (error) {
    next(error);
  }
});

carrierFleetRouter.patch("/drivers/:id", requireTrustedOrigin, async (request, response, next) => {
  try {
    const carrierId = carrier(request.authUser?.id);
    const displayName = readDriverName(request.body);
    const updated = await User.findOneAndUpdate(
      { _id: routeId(request.params.id), role: "DRIVER", carrierId },
      { displayName },
      { returnDocument: "after" },
    ).select("email username displayName accountStatus mustChangePassword");
    if (!updated) throw new HttpError(404, "not_found", "Không tìm thấy tài xế này.");
    await recordSuccessfulAudit({
      action: "DRIVER_PROFILE_UPDATED",
      actorId: carrierId,
      actorRole: "CARRIER",
      resourceType: "driver",
      resourceId: updated._id.toString(),
      relatedCarrierId: carrierId,
      fields: ["displayName"],
      correlationId: readCorrelationId(request.headers["x-request-id"]),
    });
    response.status(200).json({ driver: toDriverRosterDto(updated) });
  } catch (error) {
    next(error);
  }
});

carrierFleetRouter.post("/drivers/:id/lock", requireTrustedOrigin, async (request, response, next) => {
  try {
    rejectDriverCommand(request.body);
    const driver = await lockDriverAccount(carrier(request.authUser?.id), routeId(request.params.id), request.headers["x-request-id"]);
    response.status(200).json({ driver });
  } catch (error) {
    next(error);
  }
});

carrierFleetRouter.post("/drivers/:id/unlock", requireTrustedOrigin, async (request, response, next) => {
  try {
    rejectDriverCommand(request.body);
    const driver = await unlockDriverAccount(carrier(request.authUser?.id), routeId(request.params.id), request.headers["x-request-id"]);
    response.status(200).json({ driver });
  } catch (error) {
    next(error);
  }
});

carrierFleetRouter.post("/drivers/:id/reset-password", requireTrustedOrigin, async (request, response, next) => {
  try {
    const driver = await resetDriverPassword(carrier(request.authUser?.id), routeId(request.params.id), request.body, request.headers["x-request-id"]);
    response.status(200).json({ driver });
  } catch (error) {
    next(error);
  }
});

function carrier(id: string | undefined): string {
  if (!id) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
  return id;
}

function routeId(value: string | string[] | undefined): string {
  const id = Array.isArray(value) ? value[0] : value;
  if (!id || !isValidObjectId(id)) throw new HttpError(404, "not_found", "Không tìm thấy hồ sơ này.");
  return id;
}

async function ownedVehicle(carrierId: string, rawId: string | string[] | undefined) {
  const vehicle = await Vehicle.findOne({ _id: routeId(rawId), carrierId });
  if (!vehicle) throw new HttpError(404, "not_found", "Không tìm thấy xe này.");
  return vehicle;
}

async function linkedDriver(carrierId: string, rawId: string | string[] | undefined) {
  const driver = await User.findOne({ _id: routeId(rawId), role: "DRIVER", carrierId }).select("email username displayName accountStatus mustChangePassword");
  if (!driver) throw new HttpError(404, "not_found", "Không tìm thấy tài xế này.");
  return driver;
}

function rejectDriverCommand(body: unknown) {
  if (body == null) return;
  if (typeof body !== "object" || Array.isArray(body) || Object.keys(body).length > 0) {
    throw new HttpError(400, "invalid_request", "Yêu cầu chứa trường không được phép.");
  }
}

async function unfinishedVehicleIds(carrierId: string, vehicleIds: string[]): Promise<Set<string>> {
  if (vehicleIds.length === 0) return new Set();
  const rows = await Shipment.find({ carrierId, vehicleId: { $in: vehicleIds }, status: { $in: [...unfinishedShipmentStatuses] } }).select("vehicleId");
  return new Set(rows.map((row) => row.vehicleId?.toString()).filter((id): id is string => Boolean(id)));
}

async function unfinishedDriverIds(carrierId: string, driverIds: string[]): Promise<Set<string>> {
  if (driverIds.length === 0) return new Set();
  const rows = await Shipment.find({ carrierId, driverId: { $in: driverIds }, status: { $in: [...unfinishedShipmentStatuses] } }).select("driverId");
  return new Set(rows.map((row) => row.driverId?.toString()).filter((id): id is string => Boolean(id)));
}

function toVehicleDto(
  vehicle: {
    _id: { toString(): string };
    label: string;
    plate?: string | null;
    vehicleKind?: VehicleKind | null;
    temperatureGroup?: TemperatureGroup | null;
    capacityTon?: number | null;
    status?: VehicleStatus | null;
  },
  archiveBlocked: boolean,
) {
  const status: VehicleStatus = vehicle.status ?? "ACTIVE";
  return {
    id: vehicle._id.toString(),
    label: vehicle.label,
    plate: vehicle.plate ?? null,
    vehicleKind: vehicle.vehicleKind ?? null,
    vehicleKindLabel: vehicleKindLabel(vehicle.vehicleKind),
    temperatureGroup: vehicle.temperatureGroup ?? null,
    temperatureLabel: temperatureLabel(vehicle.temperatureGroup),
    capacityTon: vehicle.capacityTon ?? null,
    status,
    statusLabel: status === "ARCHIVED" ? "Đã lưu trữ" : "Đang hoạt động",
    canArchive: status !== "ARCHIVED" && !archiveBlocked,
    archiveBlockReason: status === "ARCHIVED" ? null : archiveBlocked ? "Xe đang gắn với chuyến chưa kết thúc." : null,
    availableForAssignment: status !== "ARCHIVED" && !archiveBlocked,
  };
}

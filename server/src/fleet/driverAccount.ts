import { isValidObjectId } from "mongoose";
import { readCorrelationId, recordSuccessfulAudit } from "../audit/recordAudit.js";
import { assertAcceptablePassword, hashPassword } from "../auth/password.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { Shipment } from "../models/shipment.js";
import { User } from "../models/user.js";

const activeAccount = { $or: [{ accountStatus: "ACTIVE" }, { accountStatus: { $exists: false } }, { accountStatus: null }] };
const passwordReady = { $or: [{ mustChangePassword: false }, { mustChangePassword: { $exists: false } }, { mustChangePassword: null }] };
const holdFree = {
  $or: [{ heldShipmentIds: { $exists: false } }, { heldShipmentIds: null }, { heldShipmentIds: { $size: 0 } }],
};
const activeTripStatuses = ["MATCHED", "IN_TRANSIT"] as const;

export type DriverRosterDto = {
  id: string;
  displayName: string | null;
  username: string | null;
  email: string | null;
  accountStatus: "ACTIVE" | "LOCKED";
  mustChangePassword: boolean;
  availableForAssignment: boolean;
  assignmentBlockReason: string | null;
};

type DriverRecord = {
  _id: { toString(): string };
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
  accountStatus?: string | null;
  mustChangePassword?: boolean | null;
};

export function normalizeLoginEmail(value: unknown): string {
  if (typeof value !== "string") throw new HttpError(400, "invalid_request", "Email đăng nhập không hợp lệ.");
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "invalid_request", "Email đăng nhập không hợp lệ.");
  }
  return email;
}

export function toDriverRosterDto(driver: DriverRecord, assignmentBlocked = false): DriverRosterDto {
  const displayName = driver.displayName?.trim() || null;
  const accountStatus = driver.accountStatus === "LOCKED" ? "LOCKED" : "ACTIVE";
  const mustChangePassword = driver.mustChangePassword === true;
  const ready = accountStatus === "ACTIVE" && !mustChangePassword;
  const availableForAssignment = ready && !assignmentBlocked;
  return {
    id: driver._id.toString(),
    displayName,
    username: driver.username?.trim() || null,
    email: driver.email?.trim() || null,
    accountStatus,
    mustChangePassword,
    availableForAssignment,
    assignmentBlockReason: assignmentBlocked ? "Tài xế đang gắn với chuyến chưa kết thúc." : null,
  };
}

export async function claimDriverForAssignment(driverId: string, carrierId: string, shipmentId: string): Promise<"claimed" | "unavailable"> {
  const claimed = await User.findOneAndUpdate(
    { _id: driverId, role: "DRIVER", carrierId, heldShipmentIds: { $ne: shipmentId }, $and: [activeAccount, passwordReady] } as object,
    { $addToSet: { heldShipmentIds: shipmentId } },
  );
  if (claimed) return "claimed";
  const resumed = await User.findOne({
    _id: driverId,
    role: "DRIVER",
    carrierId,
    heldShipmentIds: shipmentId,
    $and: [activeAccount, passwordReady],
  } as object);
  return resumed ? "claimed" : "unavailable";
}

export async function releaseDriverHold(driverId: string, shipmentId: string): Promise<void> {
  await User.updateOne({ _id: driverId }, { $pull: { heldShipmentIds: shipmentId } });
}

export async function createDriverAccount(carrierId: string, body: unknown, correlationHeader: unknown): Promise<{ driver: DriverRosterDto }> {
  const input = readCreateInput(body);
  const parent = await User.findOne({ _id: carrierId, role: "CARRIER" });
  if (!parent || parent.accountStatus === "LOCKED") {
    throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
  }
  const passwordHash = await hashPassword(input.password);
  const taken = await User.exists({ username: input.username });
  if (taken) throw new HttpError(409, "conflict", "Tên đăng nhập này đã được dùng.", { username: "Tên đăng nhập này đã được dùng." });
  try {
    const driver = await User.create({
      username: input.username,
      displayName: input.displayName,
      passwordHash,
      role: "DRIVER",
      carrierId,
      accountStatus: "ACTIVE",
      mustChangePassword: false,
      sessionVersion: 0,
    });
    await recordSuccessfulAudit({
      action: "DRIVER_ACCOUNT_CREATED",
      actorId: carrierId,
      actorRole: "CARRIER",
      resourceType: "driver",
      resourceId: driver._id.toString(),
      relatedCarrierId: carrierId,
      fields: ["displayName", "username"],
      correlationId: readCorrelationId(correlationHeader),
    });
    return { driver: toDriverRosterDto(driver) };
  } catch (error) {
    if (isDuplicate(error)) throw new HttpError(409, "conflict", "Tên đăng nhập này đã được dùng.", { username: "Tên đăng nhập này đã được dùng." });
    throw error;
  }
}

export async function lockDriverAccount(carrierId: string, rawId: string, correlationHeader: unknown): Promise<DriverRosterDto> {
  const driverId = routeDriverId(rawId);
  const owned = await ownedDriver(carrierId, driverId);
  if (owned.accountStatus === "LOCKED") throw new HttpError(409, "conflict", "Tài khoản tài xế đã khóa.");
  if (await hasActiveTrip(driverId)) throw new HttpError(409, "conflict", "Không khóa được tài xế đang phụ trách chuyến chưa kết thúc.");
  const updated = await User.findOneAndUpdate(
    { _id: driverId, role: "DRIVER", carrierId, $and: [activeAccount, holdFree] } as object,
    { $set: { accountStatus: "LOCKED" }, $inc: { sessionVersion: 1 } },
    { returnDocument: "after" },
  ).select("email username displayName accountStatus mustChangePassword");
  if (!updated) {
    if (await hasActiveTrip(driverId)) throw new HttpError(409, "conflict", "Không khóa được tài xế đang phụ trách chuyến chưa kết thúc.");
    throw new HttpError(409, "conflict", "Không khóa được tài xế đang phụ trách chuyến chưa kết thúc.");
  }
  await recordSuccessfulAudit({
    action: "DRIVER_ACCOUNT_LOCKED",
    actorId: carrierId,
    actorRole: "CARRIER",
    resourceType: "driver",
    resourceId: updated._id.toString(),
    statusBefore: "ACTIVE",
    statusAfter: "LOCKED",
    relatedCarrierId: carrierId,
    fields: ["accountStatus"],
    correlationId: readCorrelationId(correlationHeader),
  });
  return toDriverRosterDto(updated);
}

export async function unlockDriverAccount(carrierId: string, rawId: string, correlationHeader: unknown): Promise<DriverRosterDto> {
  const driverId = routeDriverId(rawId);
  const owned = await ownedDriver(carrierId, driverId);
  if (owned.accountStatus !== "LOCKED") throw new HttpError(409, "conflict", "Tài khoản tài xế đang mở.");
  const updated = await User.findOneAndUpdate(
    { _id: driverId, role: "DRIVER", carrierId, accountStatus: "LOCKED" },
    { $set: { accountStatus: "ACTIVE" } },
    { returnDocument: "after" },
  ).select("email username displayName accountStatus mustChangePassword");
  if (!updated) throw new HttpError(409, "conflict", "Tài khoản tài xế đang mở.");
  await recordSuccessfulAudit({
    action: "DRIVER_ACCOUNT_UNLOCKED",
    actorId: carrierId,
    actorRole: "CARRIER",
    resourceType: "driver",
    resourceId: updated._id.toString(),
    statusBefore: "LOCKED",
    statusAfter: "ACTIVE",
    relatedCarrierId: carrierId,
    fields: ["accountStatus"],
    correlationId: readCorrelationId(correlationHeader),
  });
  return toDriverRosterDto(updated);
}

export async function resetDriverPassword(carrierId: string, rawId: string, body: unknown, correlationHeader: unknown): Promise<DriverRosterDto> {
  const driverId = routeDriverId(rawId);
  await ownedDriver(carrierId, driverId);
  if (await hasActiveTrip(driverId)) throw new HttpError(409, "conflict", "Không đặt lại mật khẩu cho tài xế đang phụ trách chuyến chưa kết thúc.");
  const password = readPasswordPair(body);
  const passwordHash = await hashPassword(password);
  const updated = await User.findOneAndUpdate(
    { _id: driverId, role: "DRIVER", carrierId, $and: [holdFree] } as object,
    { $set: { passwordHash, mustChangePassword: false }, $inc: { sessionVersion: 1 } },
    { returnDocument: "after" },
  ).select("email username displayName accountStatus mustChangePassword");
  if (!updated) throw new HttpError(409, "conflict", "Không đặt lại mật khẩu cho tài xế đang phụ trách chuyến chưa kết thúc.");
  await recordSuccessfulAudit({
    action: "DRIVER_PASSWORD_RESET",
    actorId: carrierId,
    actorRole: "CARRIER",
    resourceType: "driver",
    resourceId: updated._id.toString(),
    relatedCarrierId: carrierId,
    fields: ["credentials"],
    correlationId: readCorrelationId(correlationHeader),
  });
  return toDriverRosterDto(updated);
}

const createFields = new Set(["displayName", "username", "password", "confirmPassword"]);

function readCreateInput(body: unknown): { displayName: string; username: string; password: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "invalid_request", "Hồ sơ tài xế không hợp lệ.");
  }
  const record = body as Record<string, unknown>;
  if (Object.keys(record).some((key) => !createFields.has(key))) {
    throw new HttpError(400, "invalid_request", "Yêu cầu chứa trường không được phép.");
  }
  const fields: Record<string, string> = {};
  const displayName = typeof record.displayName === "string" ? record.displayName.trim() : "";
  if (displayName.length < 1 || displayName.length > 80) fields.displayName = "Tên hiển thị cần từ 1 đến 80 ký tự.";
  const username = normalizeUsername(record.username);
  if (typeof username !== "string") fields.username = username.message;
  const password = typeof record.password === "string" ? record.password : "";
  if (password.length < 8 || password.length > 72) fields.password = "Mật khẩu cần từ 8 đến 72 ký tự.";
  if (typeof record.confirmPassword !== "string" || record.confirmPassword !== record.password) {
    fields.confirmPassword = "Mật khẩu nhập lại chưa khớp.";
  }
  if (Object.keys(fields).length > 0) {
    throw new HttpError(400, "invalid_request", "Một số thông tin tài xế chưa hợp lệ.", fields);
  }
  if (typeof username !== "string") throw new HttpError(400, "invalid_request", "Tên đăng nhập chưa hợp lệ.");
  return { displayName, username, password };
}

export function normalizeUsername(value: unknown): string | { message: string } {
  if (typeof value !== "string") return { message: "Tên đăng nhập dùng 3 đến 32 ký tự chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang." };
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
    return { message: "Tên đăng nhập dùng 3 đến 32 ký tự chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang." };
  }
  return username;
}

function readPasswordPair(body: unknown): string {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "invalid_request", "Mật khẩu chưa hợp lệ.");
  }
  const record = body as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== "password" && key !== "confirmPassword")) {
    throw new HttpError(400, "invalid_request", "Yêu cầu chứa trường không được phép.");
  }
  const fields: Record<string, string> = {};
  const password = typeof record.password === "string" ? record.password : "";
  if (password.length < 8 || password.length > 72) fields.password = "Mật khẩu cần từ 8 đến 72 ký tự.";
  if (typeof record.confirmPassword !== "string" || record.confirmPassword !== record.password) {
    fields.confirmPassword = "Mật khẩu nhập lại chưa khớp.";
  }
  if (Object.keys(fields).length > 0) {
    throw new HttpError(400, "invalid_request", "Một số thông tin mật khẩu chưa hợp lệ.", fields);
  }
  return password;
}

function routeDriverId(rawId: string): string {
  if (!isValidObjectId(rawId)) throw new HttpError(404, "not_found", "Không tìm thấy tài xế này.");
  return rawId;
}

async function ownedDriver(carrierId: string, driverId: string) {
  const driver = await User.findOne({ _id: driverId, role: "DRIVER", carrierId }).select("email username displayName accountStatus mustChangePassword");
  if (!driver) throw new HttpError(404, "not_found", "Không tìm thấy tài xế này.");
  return driver;
}

async function hasActiveTrip(driverId: string): Promise<boolean> {
  const trip = await Shipment.exists({ driverId, status: { $in: [...activeTripStatuses] } });
  return trip !== null;
}

function isDuplicate(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && (error as { code: unknown }).code === 11000) return true;
  return "cause" in error && isDuplicate((error as { cause: unknown }).cause);
}

export function assertReplacementPassword(password: unknown): string {
  if (typeof password !== "string") throw new HttpError(400, "invalid_request", "Mật khẩu cần từ 8 đến 72 ký tự.");
  assertAcceptablePassword(password);
  return password;
}

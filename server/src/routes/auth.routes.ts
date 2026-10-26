import { Router } from "express";
import { clearSessionCookie, setSessionCookie } from "../auth/cookies.js";
import { assertAcceptablePassword, hashPassword, verifyPassword } from "../auth/password.js";
import { isResetEmail, issuePasswordReset, normalizeResetEmail, resetPasswordWithCode } from "../auth/passwordReset.js";
import { signSessionToken } from "../auth/sessionToken.js";
import { toUserDto } from "../auth/userDto.js";
import { getEnv } from "../config/env.js";
import { assertReplacementPassword } from "../fleet/driverAccount.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireTrustedOrigin } from "../middlewares/requireOrigin.js";
import { User } from "../models/user.js";

const INVALID_CREDENTIALS = "Email, tên đăng nhập hoặc mật khẩu không đúng.";

export const authRouter = Router();

authRouter.post("/login", requireTrustedOrigin, async (request, response, next) => {
  try {
    const body: unknown = request.body;
    if (typeof body !== "object" || body === null) {
      throw new HttpError(400, "invalid_request", "Nhập email hoặc tên đăng nhập và mật khẩu.");
    }
    const record = body as Record<string, unknown>;
    const identifier = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
    const password = typeof record.password === "string" ? record.password : "";
    if (identifier.length === 0 || password.length === 0) {
      throw new HttpError(400, "invalid_request", "Nhập email hoặc tên đăng nhập và mật khẩu.");
    }
    if (password.length > 72) {
      throw new HttpError(400, "invalid_request", "Mật khẩu không hợp lệ.");
    }

    const user = identifier.includes("@")
      ? await User.findOne({ email: identifier })
      : await User.findOne({ username: identifier, role: "DRIVER" });
    const matches = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !matches) {
      throw new HttpError(401, "invalid_credentials", INVALID_CREDENTIALS);
    }
    if (user.accountStatus === "LOCKED") {
      throw new HttpError(403, "account_locked", "Tài khoản đã bị khóa.");
    }

    const token = await signSessionToken(user._id.toString(), getEnv().AUTH_SECRET, user.sessionVersion ?? 0);
    setSessionCookie(response, token);
    response.status(200).json({ user: toUserDto(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, (request, response) => {
  response.status(200).json({ user: request.authUser });
});

authRouter.post("/change-required-password", requireTrustedOrigin, requireAuth, async (request, response, next) => {
  try {
    if (!request.authUser?.mustChangePassword) {
      throw new HttpError(409, "conflict", "Tài khoản không cần đổi mật khẩu.");
    }
    const body: unknown = request.body;
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new HttpError(400, "invalid_request", "Mật khẩu cần từ 8 đến 72 ký tự.");
    }
    const record = body as Record<string, unknown>;
    if (Object.keys(record).some((key) => key !== "newPassword")) {
      throw new HttpError(400, "invalid_request", "Yêu cầu chứa trường không được phép.");
    }
    const newPassword = assertReplacementPassword(record.newPassword);
    const passwordHash = await hashPassword(newPassword);
    const updated = await User.findOneAndUpdate(
      { _id: request.authUser.id, mustChangePassword: true, accountStatus: { $ne: "LOCKED" } },
      { $set: { passwordHash, mustChangePassword: false }, $inc: { sessionVersion: 1 } },
      { returnDocument: "after" },
    );
    if (!updated) throw new HttpError(409, "conflict", "Không đổi được mật khẩu tạm.");
    const token = await signSessionToken(updated._id.toString(), getEnv().AUTH_SECRET, updated.sessionVersion ?? 0);
    setSessionCookie(response, token);
    response.status(200).json({ user: toUserDto(updated) });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", requireTrustedOrigin, (_request, response) => {
  clearSessionCookie(response);
  response.status(200).json({ ok: true });
});

authRouter.post("/register", requireTrustedOrigin, async (request, response, next) => {
  try {
    const body: unknown = request.body;
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new HttpError(400, "invalid_request", "Nhập email, mật khẩu, tên hiển thị và vai trò.");
    }
    const record = body as Record<string, unknown>;
    const allowed = new Set(["email", "password", "displayName", "role"]);
    if (Object.keys(record).some((key) => !allowed.has(key))) {
      throw new HttpError(400, "invalid_request", "Yêu cầu chứa trường không được phép.");
    }

    const fields: Record<string, string> = {};
    const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
    const displayName = typeof record.displayName === "string" ? record.displayName.trim() : "";
    const role = record.role;
    if (email.length === 0 || email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fields.email = "Nhập email hợp lệ.";
    }
    if (displayName.length === 0 || displayName.length > 80) {
      fields.displayName = "Tên hiển thị cần từ 1 đến 80 ký tự.";
    }
    if (role !== "SHIPPER" && role !== "CARRIER") {
      fields.role = "Chỉ chủ hàng và nhà xe tự đăng ký. Tài xế do nhà xe cấp, quản trị do Coldi cấp.";
    }
    let password = "";
    try {
      if (typeof record.password !== "string") throw new HttpError(400, "invalid_request", "Mật khẩu cần từ 8 đến 72 ký tự.");
      assertAcceptablePassword(record.password);
      password = record.password;
    } catch (error) {
      fields.password = error instanceof HttpError ? error.message : "Mật khẩu cần từ 8 đến 72 ký tự.";
    }
    if (Object.keys(fields).length > 0) {
      throw new HttpError(400, "invalid_request", "Còn thông tin đăng ký chưa đúng.", fields);
    }
    if (role !== "SHIPPER" && role !== "CARRIER") {
      throw new HttpError(400, "invalid_request", "Còn thông tin đăng ký chưa đúng.", fields);
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      displayName,
      role,
      accountStatus: "ACTIVE",
      mustChangePassword: false,
      sessionVersion: 0,
    });
    const token = await signSessionToken(user._id.toString(), getEnv().AUTH_SECRET, user.sessionVersion ?? 0);
    setSessionCookie(response, token);
    response.status(201).json({ user: toUserDto(user) });
  } catch (error) {
    if (isDuplicateKey(error)) {
      next(new HttpError(409, "email_taken", "Email này đã có tài khoản."));
      return;
    }
    next(error);
  }
});

authRouter.post("/forgot-password", requireTrustedOrigin, async (request, response, next) => {
  try {
    const body: unknown = request.body;
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new HttpError(400, "invalid_request", "Nhập email hợp lệ.");
    }
    const record = body as Record<string, unknown>;
    if (Object.keys(record).some((key) => key !== "email")) {
      throw new HttpError(400, "invalid_request", "Yêu cầu chứa trường không được phép.");
    }
    const email = normalizeResetEmail(record.email);
    if (!isResetEmail(email)) {
      throw new HttpError(400, "invalid_request", "Nhập email hợp lệ.", { email: "Nhập email hợp lệ." });
    }
    const issued = await issuePasswordReset(email);
    response.status(200).json(issued);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/reset-password", requireTrustedOrigin, async (request, response, next) => {
  try {
    const body: unknown = request.body;
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new HttpError(400, "invalid_request", "Nhập email, mã đặt lại và mật khẩu mới.");
    }
    const record = body as Record<string, unknown>;
    const allowed = new Set(["email", "resetCode", "newPassword"]);
    if (Object.keys(record).some((key) => !allowed.has(key))) {
      throw new HttpError(400, "invalid_request", "Yêu cầu chứa trường không được phép.");
    }
    const email = normalizeResetEmail(record.email);
    if (!isResetEmail(email)) {
      throw new HttpError(400, "invalid_request", "Nhập email hợp lệ.", { email: "Nhập email hợp lệ." });
    }
    if (typeof record.resetCode !== "string" || typeof record.newPassword !== "string") {
      throw new HttpError(400, "invalid_code", "Mã không đúng hoặc đã hết hạn.");
    }
    await resetPasswordWithCode(email, record.resetCode, record.newPassword);
    response.status(200).json({ ok: true, message: "Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới." });
  } catch (error) {
    next(error);
  }
});

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === 11000;
}

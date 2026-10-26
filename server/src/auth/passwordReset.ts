import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { assertAcceptablePassword, hashPassword } from "./password.js";
import { getEnv } from "../config/env.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { User } from "../models/user.js";

const RESET_TTL_MS = 15 * 60 * 1000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export const FORGOT_MESSAGE = "Nếu email có tài khoản đang mở, mã đặt lại hiện ở bước sau và dùng được trong 15 phút.";
export const RESET_UNAVAILABLE_MESSAGE = "Máy chủ chưa cấu hình gửi email, nên chưa cấp mã đặt lại.";
const INVALID_CODE = "Mã không đúng hoặc đã hết hạn.";

export function normalizeResetEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

export function isResetEmail(email: string): boolean {
  return email.length > 0 && email.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createResetCode(): string {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export function hashResetCode(code: string, secret: string): string {
  return createHmac("sha256", secret).update(code).digest("hex");
}

function codesMatch(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function normalizeResetCode(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function issuePasswordReset(email: string): Promise<{ message: string; resetCode?: string }> {
  const env = getEnv();
  if (env.NODE_ENV === "production") {
    return { message: RESET_UNAVAILABLE_MESSAGE };
  }

  const user = await User.findOne({ email, accountStatus: { $ne: "LOCKED" } }).select("_id email");
  if (!user?.email) {
    hashResetCode("missing-account", env.AUTH_SECRET);
    return { message: FORGOT_MESSAGE };
  }

  const resetCode = createResetCode();
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordResetHash: hashResetCode(resetCode, env.AUTH_SECRET),
        passwordResetExpiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    },
  );
  return { message: FORGOT_MESSAGE, resetCode };
}

export async function resetPasswordWithCode(email: string, resetCode: string, newPassword: string): Promise<void> {
  assertAcceptablePassword(newPassword);
  const normalized = normalizeResetCode(resetCode);
  if (normalized.length !== CODE_LENGTH) {
    throw new HttpError(400, "invalid_code", INVALID_CODE);
  }
  const env = getEnv();
  const passwordHash = await hashPassword(newPassword);
  const updated = await User.findOneAndUpdate(
    {
      email,
      accountStatus: { $ne: "LOCKED" },
      passwordResetHash: hashResetCode(normalized, env.AUTH_SECRET),
      passwordResetExpiresAt: { $gt: new Date() },
    },
    {
      $set: { passwordHash, mustChangePassword: false },
      $unset: { passwordResetHash: "", passwordResetExpiresAt: "" },
      $inc: { sessionVersion: 1 },
    },
  );
  if (!updated) {
    void codesMatch(hashResetCode(normalized, env.AUTH_SECRET), hashResetCode("missing-account", env.AUTH_SECRET));
    throw new HttpError(400, "invalid_code", INVALID_CODE);
  }
}

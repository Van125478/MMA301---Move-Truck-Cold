import { Platform } from "react-native";
import { ApiError, apiRequest } from "./client";
import { clearSessionToken, readSessionToken, writeSessionToken } from "./sessionStore";
import { parseUser, type AuthUser } from "../../types/auth";

const INVALID_USER = new ApiError(0, "invalid_response", "Máy chủ trả về dữ liệu đăng nhập không đúng cấu trúc.");

function userFrom(body: unknown): AuthUser {
  try {
    return parseUser(body);
  } catch {
    throw INVALID_USER;
  }
}

async function currentToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  return readSessionToken();
}

export type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
  role: "SHIPPER" | "CARRIER";
};

async function storeMobileSession(result: { sessionToken: string | null }, failure: string): Promise<void> {
  if (Platform.OS === "web") return;
  if (!result.sessionToken) {
    throw new ApiError(0, "missing_session", failure);
  }
  await writeSessionToken(result.sessionToken);
}

export async function registerAccount(input: RegisterInput): Promise<AuthUser> {
  const result = await apiRequest<unknown>("/api/auth/register", {
    method: "POST",
    body: input,
  });
  const user = userFrom(result.data);
  await storeMobileSession(result, "Máy chủ không trả cookie phiên. App không lưu được tài khoản vừa tạo.");
  return user;
}

export async function login(identifier: string, password: string): Promise<AuthUser> {
  const result = await apiRequest<unknown>("/api/auth/login", {
    method: "POST",
    body: { email: identifier, password },
  });
  const user = userFrom(result.data);
  await storeMobileSession(result, "Máy chủ không trả cookie phiên. App không lưu được đăng nhập.");
  return user;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = await currentToken();
  if (Platform.OS !== "web" && !token) return null;
  try {
    const result = await apiRequest<unknown>("/api/auth/me", { sessionToken: token });
    return userFrom(result.data);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      await clearSessionToken();
      return null;
    }
    throw error;
  }
}

export async function changeRequiredPassword(newPassword: string): Promise<AuthUser> {
  const token = await currentToken();
  const result = await apiRequest<unknown>("/api/auth/change-required-password", {
    method: "POST",
    body: { newPassword },
    sessionToken: token,
  });
  const user = userFrom(result.data);
  if (Platform.OS !== "web") {
    if (!result.sessionToken) {
      await clearSessionToken();
      throw new ApiError(0, "missing_session", "Đã đổi mật khẩu nhưng không nhận được phiên mới. Hãy đăng nhập lại.");
    }
    await writeSessionToken(result.sessionToken);
  }
  return user;
}

export async function logout(): Promise<void> {
  const token = await currentToken();
  try {
    await apiRequest<{ ok?: boolean }>("/api/auth/logout", { method: "POST", sessionToken: token });
  } finally {
    await clearSessionToken();
  }
}

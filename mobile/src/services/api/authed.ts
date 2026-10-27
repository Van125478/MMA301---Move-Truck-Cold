import { Platform } from "react-native";
import { apiRequest, uploadBinary, type RequestOptions } from "./client";
import { readSessionToken } from "./sessionStore";

export async function authed<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const sessionToken = Platform.OS === "web" ? null : await readSessionToken();
  const result = await apiRequest<T>(path, { ...options, sessionToken });
  return result.data;
}

export async function authedUpload(path: string, bytes: ArrayBuffer, contentType: string): Promise<unknown> {
  const sessionToken = Platform.OS === "web" ? null : await readSessionToken();
  return uploadBinary(path, bytes, contentType, sessionToken);
}

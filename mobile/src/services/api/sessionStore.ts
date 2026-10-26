import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_KEY = "coldi_session";
const REMEMBERED_ID_KEY = "coldi_login_id";

async function read(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function write(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function remove(key: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export function readSessionToken(): Promise<string | null> {
  return read(SESSION_KEY);
}

export function writeSessionToken(token: string): Promise<void> {
  return write(SESSION_KEY, token);
}

export function clearSessionToken(): Promise<void> {
  return remove(SESSION_KEY);
}

export function readRememberedId(): Promise<string | null> {
  return read(REMEMBERED_ID_KEY);
}

export function writeRememberedId(value: string): Promise<void> {
  return write(REMEMBERED_ID_KEY, value);
}

export function clearRememberedId(): Promise<void> {
  return remove(REMEMBERED_ID_KEY);
}

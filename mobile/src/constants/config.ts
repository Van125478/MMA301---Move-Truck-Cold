const raw = process.env.EXPO_PUBLIC_API_ORIGIN?.trim() || "http://127.0.0.1:4000";

export const apiOrigin = raw.replace(/\/+$/, "");

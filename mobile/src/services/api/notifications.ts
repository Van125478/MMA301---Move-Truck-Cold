import { authed } from "./authed";

export type AppNotification = {
  id: string;
  shipmentId: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

function parseNotification(value: unknown): AppNotification | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.shipmentId !== "string" || typeof row.title !== "string" || typeof row.createdAt !== "string") {
    return null;
  }
  return {
    id: row.id,
    shipmentId: row.shipmentId,
    title: row.title,
    body: typeof row.body === "string" ? row.body : "",
    createdAt: row.createdAt,
    read: row.read === true,
  };
}

export async function listNotifications(): Promise<AppNotification[]> {
  const body = await authed<{ notifications?: unknown }>("/api/notices");
  if (!Array.isArray(body.notifications)) return [];
  return body.notifications.flatMap((row) => {
    const parsed = parseNotification(row);
    return parsed ? [parsed] : [];
  });
}

export async function unreadNotificationCount(): Promise<number> {
  const body = await authed<{ unread?: unknown }>("/api/notices/unread-count");
  return typeof body.unread === "number" && body.unread > 0 ? body.unread : 0;
}

export function markNotificationRead(id: string): Promise<void> {
  return authed(`/api/notices/${id}/read`, { method: "POST", body: {} }).then(() => undefined);
}

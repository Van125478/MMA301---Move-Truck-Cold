import { authed } from "./authed";

export type ChatInboxItem = {
  conversationId: string;
  shipmentId: string;
  shipmentTitle: string;
  routeLabel: string;
  unreadCount: number;
  lastMessageBody: string;
  lastMessageAt: string | null;
  lastSenderRole: "SHIPPER" | "CARRIER" | null;
  lastMessageId: string | null;
};

export async function unreadChatCount(): Promise<number> {
  const body = await authed<{ unread?: unknown }>("/api/carrier/conversations/unread-count");
  return typeof body.unread === "number" && body.unread > 0 ? body.unread : 0;
}

export async function listChatInbox(): Promise<ChatInboxItem[]> {
  const body = await authed<{ items?: unknown }>("/api/carrier/conversations/inbox");
  if (!Array.isArray(body.items)) return [];
  return body.items.flatMap((row) => {
    if (typeof row !== "object" || row === null) return [];
    const item = row as Record<string, unknown>;
    if (typeof item.conversationId !== "string" || typeof item.shipmentId !== "string") return [];
    return [{
      conversationId: item.conversationId,
      shipmentId: item.shipmentId,
      shipmentTitle: typeof item.shipmentTitle === "string" ? item.shipmentTitle : "Chuyến hàng",
      routeLabel: typeof item.routeLabel === "string" ? item.routeLabel : "",
      unreadCount: typeof item.unreadCount === "number" ? item.unreadCount : 0,
      lastMessageBody: typeof item.lastMessageBody === "string" ? item.lastMessageBody : "",
      lastMessageAt: typeof item.lastMessageAt === "string" ? item.lastMessageAt : null,
      lastSenderRole: item.lastSenderRole === "SHIPPER" || item.lastSenderRole === "CARRIER" ? item.lastSenderRole : null,
      lastMessageId: typeof item.lastMessageId === "string" ? item.lastMessageId : null,
    }];
  });
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { useAuth } from "../auth/AuthProvider";
import { useFlashNotice } from "../flash/FlashNoticeProvider";
import { listChatInbox, type ChatInboxItem } from "../../services/api/chatInbox";

const POLL_MS = 12000;

type ChatInboxContextValue = {
  unread: number;
  items: ChatInboxItem[];
  refresh: () => Promise<void>;
};

const ChatInboxContext = createContext<ChatInboxContextValue | null>(null);

export function ChatInboxProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const flash = useFlashNotice();
  const [items, setItems] = useState<ChatInboxItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ready = useRef(false);
  const lastFlashMessageId = useRef<string | null>(null);

  const carrierSignedIn = session.status === "authenticated" && session.user.role === "CARRIER";

  const refresh = useCallback(async () => {
    if (!carrierSignedIn) {
      setItems([]);
      setUnread(0);
      ready.current = false;
      lastFlashMessageId.current = null;
      return;
    }
    try {
      const rows = await listChatInbox();
      setItems(rows);
      const total = rows.reduce((sum, row) => sum + row.unreadCount, 0);
      setUnread(total);

      const incoming = rows.find(
        (row) => row.unreadCount > 0 && row.lastSenderRole === "SHIPPER" && row.lastMessageId,
      );
      if (!incoming?.lastMessageId) {
        if (!ready.current) ready.current = true;
        return;
      }
      if (!ready.current) {
        lastFlashMessageId.current = incoming.lastMessageId;
        ready.current = true;
        return;
      }
      if (incoming.lastMessageId === lastFlashMessageId.current) return;
      lastFlashMessageId.current = incoming.lastMessageId;
      const preview =
        incoming.lastMessageBody.length > 72 ? `${incoming.lastMessageBody.slice(0, 72)}…` : incoming.lastMessageBody;
      flash.show({
        kind: "chat",
        title: "Chủ hàng nhắn tin",
        body: `${incoming.shipmentTitle}: ${preview}`,
      });
    } catch {
      /* optional */
    }
  }, [carrierSignedIn, flash]);

  useEffect(() => {
    if (!carrierSignedIn) {
      setItems([]);
      setUnread(0);
      ready.current = false;
      lastFlashMessageId.current = null;
      return;
    }
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [carrierSignedIn, refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const value = useMemo(() => ({ unread, items, refresh }), [items, refresh, unread]);

  return <ChatInboxContext.Provider value={value}>{children}</ChatInboxContext.Provider>;
}

export function useChatInbox(): ChatInboxContextValue {
  const ctx = useContext(ChatInboxContext);
  if (!ctx) throw new Error("useChatInbox must be used within ChatInboxProvider");
  return ctx;
}

/** Safe when provider is absent (guest screens). */
export function useChatInboxOptional(): ChatInboxContextValue | null {
  return useContext(ChatInboxContext);
}

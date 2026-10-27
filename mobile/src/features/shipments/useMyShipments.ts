import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMyShipments } from "../../services/api/shipments";
import { ApiError } from "../../services/api/client";
import type { Shipment } from "../../types/shipment";

export type ShipmentListErrorKind = "network" | "session" | "forbidden" | "server";

export type ShipmentListState =
  | { status: "loading" }
  | { status: "error"; kind: ShipmentListErrorKind; message: string }
  | { status: "ready"; shipments: Shipment[] };

function classify(error: unknown): { kind: ShipmentListErrorKind; message: string } {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return { kind: "network", message: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại." };
    }
    if (error.status === 401) {
      return { kind: "session", message: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại." };
    }
    if (error.status === 403) {
      return { kind: "forbidden", message: "Tài khoản này không có quyền xem danh sách đơn." };
    }
    return { kind: "server", message: error.message || "Máy chủ gặp lỗi. Hãy thử lại." };
  }
  return { kind: "server", message: "Không tải được danh sách đơn. Hãy thử lại." };
}

export function useMyShipments() {
  const [state, setState] = useState<ShipmentListState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setState({ status: "loading" });
    try {
      const shipments = await fetchMyShipments();
      if (!mounted.current) return;
      setState({ status: "ready", shipments });
    } catch (error) {
      if (!mounted.current) return;
      setState({ status: "error", ...classify(error) });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ silent: true });
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, [load]);

  return { state, refreshing, refresh, reload: load };
}

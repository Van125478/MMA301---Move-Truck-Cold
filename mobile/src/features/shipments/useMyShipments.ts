import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMyShipments } from "../../services/api/shipments";
import { ApiError } from "../../services/api/client";
import type { Shipment } from "../../types/shipment";

export type ShipmentListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; shipments: Shipment[] };

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
      const message = error instanceof ApiError ? error.message : "Không tải được danh sách đơn. Hãy thử lại.";
      setState({ status: "error", message });
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

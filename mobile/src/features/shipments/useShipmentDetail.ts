import { useCallback, useEffect, useRef, useState } from "react";
import { cancelShipment, fetchShipmentDetail } from "../../services/api/shipments";
import { classifyApiError, type ApiErrorKind } from "../../utils/apiErrorClassifier";
import type { ShipmentDetail } from "../../types/shipment";

export type ShipmentDetailState =
  | { status: "loading" }
  | { status: "error"; kind: ApiErrorKind; message: string }
  | { status: "ready"; shipment: ShipmentDetail };

export function useShipmentDetail(id: string) {
  const [state, setState] = useState<ShipmentDetailState>({ status: "loading" });
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const shipment = await fetchShipmentDetail(id);
      if (!mounted.current) return;
      setState({ status: "ready", shipment });
    } catch (error) {
      if (!mounted.current) return;
      setState({ status: "error", ...classifyApiError(error) });
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = useCallback(async (): Promise<boolean> => {
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelShipment(id);
      if (!mounted.current) return true;
      await load();
      return true;
    } catch (error) {
      if (!mounted.current) return false;
      setCancelError(classifyApiError(error).message);
      return false;
    } finally {
      if (mounted.current) setCancelling(false);
    }
  }, [id, load]);

  return { state, reload: load, cancel, cancelling, cancelError, clearCancelError: () => setCancelError(null) };
}

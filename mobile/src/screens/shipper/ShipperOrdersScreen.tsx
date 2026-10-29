import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ShipperOrdersHubFilters,
  type ShipperOrdersHubSection,
} from "../../components/layout/ShipperOrdersHubFilters";
import { paymentByShipment, readFreightPayments } from "../../features/freightPayments/store";
import { useAuth } from "../../features/auth/AuthProvider";
import { listIncidentsForCarrier } from "../../services/api/operations";
import { listMarketplaceShipments, listShipments } from "../../services/api/shipments";
import { CarrierIncidentLookupScreen } from "../carrier/CarrierHubToolScreens";
import { OrderListScreen } from "../shipments/OrderListScreen";
import { ShipperFreightPaymentScreen } from "./ShipperFreightPaymentScreen";

type ShipperView = null | "find" | "tracking" | "payment" | "incidents";

const delivered = new Set(["DELIVERY_CONFIRMED", "COMPLETED"]);

function hubActive(view: ShipperView): ShipperOrdersHubSection {
  if (view === "find") return "find";
  if (view === "tracking") return "tracking";
  if (view === "payment") return "payment";
  if (view === "incidents") return "incidents";
  return "manage";
}

export function ShipperOrdersScreen({
  onOpenDetail,
  onOpenFavorites,
  onCreateOrder,
}: {
  onOpenDetail: (id: string) => void;
  onOpenFavorites: () => void;
  onCreateOrder: () => void;
}) {
  const { session } = useAuth();
  const userId = session.status === "authenticated" ? session.user.id : null;
  const [view, setView] = useState<ShipperView>(null);
  const [counts, setCounts] = useState<Record<ShipperOrdersHubSection, number>>({
    manage: 0,
    find: 0,
    tracking: 0,
    payment: 0,
    incidents: 0,
  });

  const refreshCounts = useCallback(async () => {
    try {
      const [rows, board, incidents] = await Promise.all([
        listShipments("mine"),
        listMarketplaceShipments(),
        listIncidentsForCarrier(),
      ]);
      let paymentPending = 0;
      if (userId) {
        const paid = paymentByShipment(await readFreightPayments(userId));
        paymentPending = rows.filter((row) => delivered.has(row.status) && !paid.has(row.id)).length;
      }
      setCounts({
        manage: rows.length,
        find: board.length,
        tracking: rows.filter((row) => row.hasGpsUpdate).length,
        payment: paymentPending,
        incidents: incidents.filter((row) => row.status !== "CLOSED").length,
      });
    } catch {
      /* badges optional */
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void refreshCounts();
    }, [refreshCounts]),
  );

  const onHubChange = useCallback((id: ShipperOrdersHubSection) => {
    if (id === "manage") setView(null);
    else setView(id);
  }, []);

  const hub = <ShipperOrdersHubFilters active={hubActive(view)} counts={counts} onChange={onHubChange} />;

  if (view === "incidents") {
    return <CarrierIncidentLookupScreen hub={hub} onOpenDetail={onOpenDetail} emptyListBody="Sự cố trên đơn của bạn sẽ hiện ở đây." />;
  }

  if (view === "payment") {
    return <ShipperFreightPaymentScreen hub={hub} onOpenDetail={onOpenDetail} onPaymentsChange={() => void refreshCounts()} />;
  }

  const tracking = view === "tracking";
  const find = view === "find";

  return (
    <OrderListScreen
      mode="mine"
      boardPromo
      promoArtIcon="package-variant-closed"
      title="Đơn hàng"
      lede="Chủ động gửi hàng lạnh, theo dõi hành trình rõ ràng."
      searchPlaceholder="Mô tả hàng, điểm lấy, điểm giao"
      marketplaceOnly={find}
      hubStatusFilter={tracking ? "gps" : null}
      sectionTitle={tracking ? "Theo dõi đơn hàng" : undefined}
      onOpenFavorites={onOpenFavorites}
      primaryAction={{ label: "Tạo đơn mới", onPress: onCreateOrder }}
      emptyTitle={find ? "Chưa có đơn trên sàn" : tracking ? "Chưa có đơn cập nhật GPS" : "Chưa có đơn"}
      emptyBody={
        find
          ? "Khi có đơn đang tìm xe trên sàn, bạn có thể xem và lưu yêu thích tại đây."
          : tracking
            ? "Chỉ hiện đơn đang chạy và đã có vị trí xe từ tài xế. Mở đơn để xem bản đồ."
            : "Bấm Tạo đơn mới để niêm yết nhu cầu vận chuyển lạnh."
      }
      onOpenDetail={onOpenDetail}
      headerAddon={hub}
      onListRefresh={() => void refreshCounts()}
    />
  );
}

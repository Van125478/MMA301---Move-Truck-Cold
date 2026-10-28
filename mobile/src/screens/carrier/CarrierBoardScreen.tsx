import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  CarrierBoardHubFilters,
  type CarrierBoardHubSection,
} from "../../components/layout/CarrierBoardHubFilters";
import { space } from "../../constants/theme";
import { listIncidentsForCarrier, loadCommissionMine } from "../../services/api/operations";
import { loadFleet } from "../../services/api/shipments";
import { FleetScreen } from "../fleet/FleetScreen";
import { OrderListScreen } from "../shipments/OrderListScreen";
import { CarrierIncidentLookupScreen, CarrierTransactionHistoryScreen } from "./CarrierHubToolScreens";

export function CarrierBoardScreen({
  onOpenDetail,
  onOpenFavorites,
}: {
  onOpenDetail: (id: string) => void;
  onOpenFavorites: () => void;
}) {
  const [section, setSection] = useState<CarrierBoardHubSection | null>(null);
  const [counts, setCounts] = useState<Record<CarrierBoardHubSection, number>>({
    vehicles: 0,
    drivers: 0,
    transactions: 0,
    incidents: 0,
  });

  const refreshCounts = useCallback(async () => {
    try {
      const [fleet, commission, incidents] = await Promise.all([
        loadFleet(),
        loadCommissionMine(),
        listIncidentsForCarrier(),
      ]);
      setCounts({
        vehicles: fleet.vehicles.length,
        drivers: fleet.drivers.length,
        transactions: commission.entries.length,
        incidents: incidents.filter((row) => row.status !== "CLOSED").length,
      });
    } catch {
      /* badges optional */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshCounts();
    }, [refreshCounts]),
  );

  const hub = (
    <CarrierBoardHubFilters active={section} counts={counts} onChange={setSection} />
  );

  if (section === "vehicles") {
    return (
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hubPad}>{hub}</View>
        <FleetScreen show="vehicles" embedded onFleetChange={() => void refreshCounts()} />
      </ScrollView>
    );
  }

  if (section === "drivers") {
    return (
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hubPad}>{hub}</View>
        <FleetScreen show="drivers" embedded onFleetChange={() => void refreshCounts()} />
      </ScrollView>
    );
  }

  if (section === "transactions") {
    return <CarrierTransactionHistoryScreen hub={hub} onOpenDetail={onOpenDetail} />;
  }

  if (section === "incidents") {
    return <CarrierIncidentLookupScreen hub={hub} onOpenDetail={onOpenDetail} />;
  }

  return (
    <OrderListScreen
      mode="board"
      boardPromo
      title="Sàn chuyến"
      lede="Đơn đang tìm xe. Nhà xe tự nhận, không có máy ghép."
      searchPlaceholder="Mô tả hàng, điểm lấy, điểm giao"
      emptyTitle="Chưa có chuyến đang mở"
      emptyBody="Khi chủ hàng đăng đơn, chuyến hiện ở đây."
      onOpenDetail={onOpenDetail}
      onOpenFavorites={onOpenFavorites}
      headerAddon={hub}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingBottom: 96, flexGrow: 1 },
  hubPad: { paddingHorizontal: space.lg, paddingTop: space.sm },
});

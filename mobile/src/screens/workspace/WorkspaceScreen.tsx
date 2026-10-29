import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PhoneFrame } from "../../components/common/PhoneFrame";
import { ScreenTopBar } from "../../components/layout/ScreenTopBar";
import { TabBar, type TabItem } from "../../components/navigation/TabBar";
import { space, useTheme } from "../../constants/theme";
import { listShipments } from "../../services/api/shipments";
import { liveShareStartedAt, startLiveShare, stopLiveShare } from "../../services/location/liveShare";
import { useAuth } from "../../features/auth/AuthProvider";
import { useFavorites } from "../../features/favorites/FavoritesProvider";
import type { UserRole } from "../../types/auth";
import { AccountScreen } from "../account/AccountScreen";
import { FavoritesScreen } from "../favorites/FavoritesScreen";
import { CreateOrderScreen } from "../shipments/CreateOrderScreen";
import { ClaimedTripsScreen } from "../shipments/ClaimedTripsScreen";
import { OrderListScreen } from "../shipments/OrderListScreen";
import { ShipmentDetailPanel } from "../shipments/ShipmentDetailScreen";
import { CarrierBoardScreen } from "../carrier/CarrierBoardScreen";
import { ShipperOrdersScreen } from "../shipper/ShipperOrdersScreen";

const shipperTabs: TabItem[] = [
  { id: "orders", label: "Đơn hàng", icon: "clipboard-text-outline" },
  { id: "create", label: "Tạo đơn", icon: "plus" },
  { id: "saved", label: "Yêu thích", icon: "heart-outline" },
  { id: "account", label: "Tài khoản", icon: "account-outline" },
];

const carrierTabs: TabItem[] = [
  { id: "board", label: "Sàn chuyến", icon: "truck-outline" },
  { id: "claimed", label: "Đã nhận", icon: "clipboard-check-outline" },
  { id: "saved", label: "Yêu thích", icon: "heart-outline" },
  { id: "account", label: "Tài khoản", icon: "account-outline" },
];

const driverTabs: TabItem[] = [
  { id: "trips", label: "Chuyến", icon: "steering" },
  { id: "saved", label: "Yêu thích", icon: "heart-outline" },
  { id: "account", label: "Tài khoản", icon: "account-outline" },
];

const adminTabs: TabItem[] = [{ id: "account", label: "Tài khoản", icon: "account-outline" }];

function DriverLiveShare() {
  const { session } = useAuth();
  const role = session.status === "authenticated" ? session.user.role : null;
  useFocusEffect(
    useCallback(() => {
      if (role !== "DRIVER") return;
      let cancel = false;
      const requestedAt = Date.now();
      void listShipments("driver")
        .then((rows) => {
          if (cancel) return;
          const live = rows.find((row) => row.status === "IN_TRANSIT");
          if (live) startLiveShare(live.id);
          else if (liveShareStartedAt() < requestedAt) stopLiveShare();
        })
        .catch(() => undefined);
      return () => {
        cancel = true;
      };
    }, [role]),
  );
  return null;
}

function tabsWithSavedBadge(items: readonly TabItem[], savedCount: number): TabItem[] {
  return items.map((item) => (item.id === "saved" ? { ...item, badgeCount: savedCount } : item));
}

function Pane({ visible, children }: { visible: boolean; children: ReactNode }) {
  return (
    <View
      style={visible ? styles.body : styles.hidden}
      pointerEvents={visible ? "auto" : "none"}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
    >
      {children}
    </View>
  );
}

export function WorkspaceScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const favorites = useFavorites();
  const role = session.status === "authenticated" ? session.user.role : "SHIPPER";
  const savedCount = favorites.ready ? favorites.items.length : 0;
  const tabs = useMemo(() => {
    const base = role === "CARRIER" ? carrierTabs : role === "DRIVER" ? driverTabs : role === "ADMIN" ? adminTabs : shipperTabs;
    if (role === "ADMIN") return base;
    return tabsWithSavedBadge(base, savedCount);
  }, [role, savedCount]);
  const [tab, setTab] = useState(tabs[0]?.id ?? "account");
  const [detailId, setDetailId] = useState<string | null>(null);

  function openDetail(id: string) {
    setDetailId(id);
  }

  function changeTab(id: string) {
    setDetailId(null);
    setTab(id);
  }

  const openDetailProp = (id: string) => openDetail(id);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safe, { backgroundColor: colors.background }]}>
      <PhoneFrame style={styles.frame}>
        {role === "DRIVER" ? <DriverLiveShare /> : null}
        <View style={styles.shell}>
          {detailId ? null : <ScreenTopBar />}
          <View style={styles.body}>
            {detailId ? <ShipmentDetailPanel shipmentId={detailId} onClose={() => setDetailId(null)} /> : null}
            {role === "SHIPPER" ? (
              <Pane visible={!detailId && tab === "orders"}>
                <ShipperOrdersScreen
                  onOpenDetail={openDetailProp}
                  onOpenFavorites={() => changeTab("saved")}
                  onCreateOrder={() => changeTab("create")}
                />
              </Pane>
            ) : null}
            {role === "SHIPPER" ? (
              <Pane visible={!detailId && tab === "create"}>
                <CreateOrderScreen
                  onCreated={(id) => {
                    setTab("orders");
                    openDetail(id);
                  }}
                />
              </Pane>
            ) : null}
            {role === "CARRIER" ? (
              <Pane visible={!detailId && tab === "board"}>
                <CarrierBoardScreen onOpenDetail={openDetailProp} onOpenFavorites={() => changeTab("saved")} />
              </Pane>
            ) : null}
            {role === "CARRIER" ? (
              <Pane visible={!detailId && tab === "claimed"}>
                <ClaimedTripsScreen onOpenDetail={openDetailProp} />
              </Pane>
            ) : null}
            {role === "DRIVER" ? (
              <Pane visible={!detailId && tab === "trips"}>
                <OrderListScreen
                  mode="driver"
                  boardPromo
                  promoArtIcon="steering"
                  title="Chuyến được giao"
                  lede="Chỉ hiện chuyến nhà xe đã phân công cho tài xế này."
                  searchPlaceholder="Mô tả hàng, điểm lấy, điểm giao"
                  emptyTitle="Chưa có chuyến"
                  emptyBody="Khi nhà xe phân công xe và tài xế, chuyến hiện ở đây."
                  onOpenDetail={openDetailProp}
                />
              </Pane>
            ) : null}
            {role !== "ADMIN" ? (
              <Pane visible={!detailId && tab === "saved"}>
                <FavoritesScreen
                  onOpenDetail={openDetailProp}
                  title={role === "SHIPPER" ? "Đơn đã lưu" : "Yêu thích"}
                  lede={role === "SHIPPER" ? "Mở lại nhanh các đơn bạn đánh dấu trái tim." : "Đơn và chuyến bạn đã lưu trên máy này."}
                  boardPromo
                  promoArtIcon="heart"
                />
              </Pane>
            ) : null}
            <Pane visible={!detailId && tab === "account"}>
              <AccountScreen />
            </Pane>
          </View>
        </View>
        <TabBar items={tabs} active={tab} onChange={changeTab} />
      </PhoneFrame>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  frame: { flex: 1 },
  shell: { flex: 1, minHeight: 0 },
  body: { flex: 1, minHeight: 0 },
  hidden: { display: "none" },
});

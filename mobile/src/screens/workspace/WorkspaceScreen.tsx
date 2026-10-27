import { useCallback, useState, type ReactNode } from "react";
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
import type { UserRole } from "../../types/auth";
import { AccountScreen } from "../account/AccountScreen";
import { FavoritesScreen } from "../favorites/FavoritesScreen";
import { CreateOrderScreen } from "../shipments/CreateOrderScreen";
import { OrderListScreen } from "../shipments/OrderListScreen";
import { ShipmentDetailPanel } from "../shipments/ShipmentDetailScreen";

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
  const role = session.status === "authenticated" ? session.user.role : "SHIPPER";
  const tabs = role === "CARRIER" ? carrierTabs : role === "DRIVER" ? driverTabs : role === "ADMIN" ? adminTabs : shipperTabs;
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
                <OrderListScreen
                  mode="mine"
                  kicker="Giải pháp · Chủ hàng"
                  title="Chủ động gửi hàng lạnh, theo dõi hành trình rõ ràng."
                  lede="Đơn bạn niêm yết hiển thị dưới đây. Tạo đơn mới hoặc mở chi tiết để theo dõi chuyến."
                  searchLabel="Tìm hàng, điểm lấy, điểm giao"
                  includeMarketplace
                  primaryAction={{ label: "Tạo đơn mới", onPress: () => changeTab("create") }}
                  emptyTitle="Chưa có đơn"
                  emptyBody="Bấm Tạo đơn mới để niêm yết nhu cầu vận chuyển lạnh."
                  onOpenDetail={openDetailProp}
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
                <OrderListScreen
                  mode="board"
                  title="Sàn chuyến"
                  lede="Đơn đang tìm xe. Nhà xe tự nhận, không có máy ghép."
                  emptyTitle="Chưa có chuyến đang mở"
                  emptyBody="Khi chủ hàng đăng đơn, chuyến hiện ở đây."
                  onOpenDetail={openDetailProp}
                />
              </Pane>
            ) : null}
            {role === "CARRIER" ? (
              <Pane visible={!detailId && tab === "claimed"}>
                <OrderListScreen
                  mode="claimed"
                  title="Chuyến đã nhận"
                  lede="Chuyến nhà xe này đã nhận. Phân công xe và tài xế trong chi tiết."
                  emptyTitle="Chưa nhận chuyến"
                  emptyBody="Vào sàn chuyến để nhận đơn đang tìm xe."
                  onOpenDetail={openDetailProp}
                />
              </Pane>
            ) : null}
            {role === "DRIVER" ? (
              <Pane visible={!detailId && tab === "trips"}>
                <OrderListScreen
                  mode="driver"
                  title="Chuyến được giao"
                  lede="Chỉ hiện chuyến nhà xe đã phân công cho tài xế này."
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
                  kicker={role === "SHIPPER" ? "Giải pháp · Chủ hàng" : undefined}
                  title={role === "SHIPPER" ? "Đơn đã lưu" : "Yêu thích"}
                  lede={role === "SHIPPER" ? "Mở lại nhanh các đơn bạn đánh dấu trái tim." : "Đơn và chuyến bạn đã lưu trên máy này."}
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

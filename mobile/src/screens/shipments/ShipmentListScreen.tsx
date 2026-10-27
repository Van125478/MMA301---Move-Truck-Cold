import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShipmentCard } from "../../components/shipment/ShipmentCard";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { space, type as textType, useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import { useMyShipments, type ShipmentListErrorKind } from "../../features/shipments/useMyShipments";
import type { Shipment } from "../../types/shipment";

const errorIconByKind: Record<ShipmentListErrorKind, keyof typeof MaterialCommunityIcons.glyphMap> = {
  network: "wifi-off",
  session: "lock-outline",
  forbidden: "shield-alert-outline",
  server: "alert-circle-outline",
};

const errorTitleByKind: Record<ShipmentListErrorKind, string> = {
  network: "Mất kết nối",
  session: "Hết phiên đăng nhập",
  forbidden: "Không có quyền truy cập",
  server: "Máy chủ gặp lỗi",
};

export function ShipmentListScreen({ onOpenShipment }: { onOpenShipment?: (shipment: Shipment) => void }) {
  const { colors } = useTheme();
  const { logout } = useAuth();
  const { state, refreshing, refresh, reload } = useMyShipments();

  if (state.status === "loading") {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View accessibilityRole="progressbar" accessibilityLabel="Đang tải danh sách đơn" style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.body, { color: colors.muted, marginTop: space.md }]}>Đang tải danh sách đơn…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === "error") {
    const isSessionError = state.kind === "session";
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View accessibilityRole="alert" style={styles.center}>
          <MaterialCommunityIcons name={errorIconByKind[state.kind]} size={40} color={colors.danger} />
          <Text accessibilityRole="header" style={[styles.errorTitle, { color: colors.ink, marginTop: space.md }]}>
            {errorTitleByKind[state.kind]}
          </Text>
          <Text style={[styles.body, { color: colors.muted, textAlign: "center", marginTop: space.sm }]}>{state.message}</Text>
          {isSessionError ? (
            <PrimaryButton label="Đăng nhập lại" onPress={() => void logout()} />
          ) : (
            <PrimaryButton label="Thử lại" onPress={() => void reload()} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const { shipments } = state;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={[styles.headerTitle, { color: colors.ink }]}>
          Đơn hàng của tôi
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {shipments.length === 0 ? "Chưa có đơn nào." : `${shipments.length} đơn.`}
        </Text>
      </View>

      {shipments.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="package-variant-closed" size={40} color={colors.hint} />
          <Text style={[styles.body, { color: colors.muted, textAlign: "center", marginTop: space.md }]}>
            Đăng đơn đầu tiên để tìm nhà xe.
          </Text>
        </View>
      ) : (
        <FlatList
          data={shipments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
          renderItem={({ item }) => <ShipmentCard shipment={item} onPress={() => onOpenShipment?.(item)} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.md },
  headerTitle: { ...textType.display },
  errorTitle: { ...textType.title },
  subtitle: { ...textType.body, marginTop: space.xs },
  list: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xxl },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl },
  body: { ...textType.body },
});

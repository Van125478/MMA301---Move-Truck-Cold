import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShipmentCard } from "../../components/shipment/ShipmentCard";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { space, type as textType, useTheme } from "../../constants/theme";
import { useMyShipments } from "../../features/shipments/useMyShipments";
import type { Shipment } from "../../types/shipment";

export function ShipmentListScreen({ onOpenShipment }: { onOpenShipment?: (shipment: Shipment) => void }) {
  const { colors } = useTheme();
  const { state, refreshing, refresh, reload } = useMyShipments();

  if (state.status === "loading") {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={[styles.body, { color: colors.muted }]}>Đang tải danh sách đơn…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === "error") {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <MaterialCommunityIcons name="cloud-off-outline" size={40} color={colors.hint} />
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink, marginTop: space.md }]}>
            Không tải được đơn
          </Text>
          <Text style={[styles.body, { color: colors.muted, textAlign: "center" }]}>{state.message}</Text>
          <PrimaryButton label="Thử lại" onPress={() => void reload()} />
        </View>
      </SafeAreaView>
    );
  }

  const { shipments } = state;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={[styles.title, { color: colors.ink }]}>
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
  title: { ...textType.display },
  subtitle: { ...textType.body, marginTop: space.xs },
  list: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xxl },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl },
  body: { ...textType.body },
});

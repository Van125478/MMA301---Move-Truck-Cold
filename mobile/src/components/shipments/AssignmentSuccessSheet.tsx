import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "../common/PrimaryButton";
import { pointer } from "../../constants/hit";
import { radius, space, useTheme } from "../../constants/theme";
import type { Shipment } from "../../types/shipment";
import { formatVnd } from "../../utils/format";

function orderCode(id: string): string {
  const tail = id.replace(/[^a-f0-9]/gi, "").slice(-4).toUpperCase();
  return tail.length > 0 ? `#${tail}` : `#${id.slice(-4)}`;
}

export function AssignmentSuccessSheet({
  visible,
  shipment,
  onClose,
  onViewDetail,
}: {
  visible: boolean;
  shipment: Shipment | null;
  onClose: () => void;
  onViewDetail: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!shipment) return null;

  const vehicleLine = shipment.vehicleLabel ?? "Xe đã chọn";
  const driverLine = shipment.driverName ?? "Tài xế đã chọn";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} style={styles.backdropTap} />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + space.lg }]}
        >
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.line }]} />
            <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} hitSlop={8} style={[styles.close, pointer]}>
              <MaterialCommunityIcons name="close" size={24} color={colors.ink} />
            </Pressable>
          </View>

          <View style={[styles.iconCircle, { backgroundColor: colors.successBg }]}>
            <MaterialCommunityIcons name="check" size={40} color={colors.success} />
          </View>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.brand }]}>Phân công thành công!</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Mã đơn hàng: {orderCode(shipment.id)} · Đã gán xe và tài xế
          </Text>

          <View style={[styles.card, { borderColor: colors.primary, backgroundColor: colors.badge }]}>
            <View style={styles.routeRow}>
              <MaterialCommunityIcons name="map-marker-radius" size={20} color={colors.primary} />
              <Text style={[styles.routeText, { color: colors.ink }]}>
                {shipment.pickupLocation}
                <Text style={{ color: colors.primary }}> → </Text>
                {shipment.deliveryLocation}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="truck-outline" size={18} color={colors.ink} />
              <Text style={[styles.metaText, { color: colors.ink }]} numberOfLines={1}>{vehicleLine}</Text>
              <View style={[styles.tempBadge, { backgroundColor: colors.surface }]}>
                <MaterialCommunityIcons name="snowflake" size={14} color={colors.primary} />
                <Text style={[styles.tempText, { color: colors.primary }]}>{shipment.temperatureLabel}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="account-outline" size={18} color={colors.ink} />
              <Text style={[styles.metaText, { color: colors.ink }]} numberOfLines={1}>{driverLine}</Text>
            </View>
            <Text style={[styles.priceLine, { color: colors.ink }]}>
              Cước: <Text style={styles.priceValue}>{formatVnd(shipment.listedPriceVnd)}</Text>
            </Text>
            <View style={[styles.statusPill, { backgroundColor: colors.successBg }]}>
              <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.statusText, { color: colors.success }]}>Tài xế có thể xác nhận lấy hàng</Text>
            </View>
          </View>

          <View style={styles.noteRow}>
            <MaterialCommunityIcons name="bell-outline" size={18} color={colors.muted} />
            <Text style={[styles.note, { color: colors.muted }]}>
              Tài xế {driverLine} sẽ thấy chuyến trong tab Chuyến và nhận thông báo trên app.
            </Text>
          </View>

          <PrimaryButton
            spaced={false}
            label="Xem chi tiết đơn hàng"
            onPress={() => {
              onViewDetail();
              onClose();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.5)" },
  backdropTap: { ...StyleSheet.absoluteFill },
  sheet: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: space.md,
    alignItems: "center",
  },
  handleRow: { width: "100%", alignItems: "center", minHeight: 28 },
  handle: { width: 40, height: 4, borderRadius: 2, marginTop: space.xs },
  close: { position: "absolute", right: 0, top: 0, width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginTop: space.xs },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 30, textAlign: "center" },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, textAlign: "center", paddingHorizontal: space.md },
  card: { width: "100%", borderWidth: 1, borderRadius: radius.card, padding: space.lg, gap: space.sm },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  routeText: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
  metaText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20, minWidth: 120 },
  tempBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.pill },
  tempText: { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 16 },
  priceLine: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  priceValue: { fontFamily: "Inter_700Bold" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    alignSelf: "flex-start",
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    marginTop: space.xs,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  noteRow: { width: "100%", flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  note: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
});

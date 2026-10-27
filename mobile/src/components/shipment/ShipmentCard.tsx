import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { panelChrome, space, type as textType, useTheme } from "../../constants/theme";
import type { Shipment } from "../../types/shipment";
import { formatCalendarDate, formatVnd } from "../../utils/format";
import { ShipmentStatusBadge } from "./ShipmentStatusBadge";

export function ShipmentCard({ shipment, onPress }: { shipment: Shipment; onPress: () => void }) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Đơn ${shipment.cargoDescription}, ${shipment.statusLabel}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, panelChrome(colors), { backgroundColor: pressed ? colors.field : colors.surface }]}
    >
      <View style={styles.topRow}>
        <ShipmentStatusBadge status={shipment.status} label={shipment.statusLabel} />
        <Text style={[styles.price, { color: colors.ink }]} numberOfLines={1}>
          {formatVnd(shipment.listedPriceVnd)}
        </Text>
      </View>

      <Text style={[styles.title, { color: colors.ink }]} numberOfLines={2}>
        {shipment.cargoDescription}
      </Text>

      <View style={styles.row}>
        <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.muted} />
        <Text style={[styles.rowText, { color: colors.muted }]} numberOfLines={1}>
          {shipment.pickupLocation}
        </Text>
      </View>
      <View style={styles.row}>
        <MaterialCommunityIcons name="map-marker-check-outline" size={18} color={colors.muted} />
        <Text style={[styles.rowText, { color: colors.muted }]} numberOfLines={1}>
          {shipment.deliveryLocation}
        </Text>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.line }]}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="calendar-outline" size={16} color={colors.hint} />
          <Text style={[styles.footerText, { color: colors.hint }]}>Lấy hàng {formatCalendarDate(shipment.pickupDate)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.badge }]}>
          <Text style={[styles.badgeText, { color: colors.badgeInk }]} numberOfLines={1}>
            {shipment.temperatureLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.lg, marginBottom: space.lg },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  price: { fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 22 },
  title: { ...textType.title, marginTop: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm },
  rowText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  footer: {
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  footerText: { fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 },
  badge: { borderRadius: 999, paddingHorizontal: space.md, paddingVertical: 4 },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 16 },
});

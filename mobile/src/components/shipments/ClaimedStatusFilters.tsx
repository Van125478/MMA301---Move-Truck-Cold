import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { pointer } from "../../constants/hit";
import { space, useTheme } from "../../constants/theme";
import type { Shipment } from "../../types/shipment";
import { isCarrierAssigned } from "../../utils/shipmentDisplay";

export type ClaimedStatusKey = "assign" | "pickup" | "running" | "done" | "cancelled";
export type ClaimedViewFilter = ClaimedStatusKey | "all";

/** Nhóm hiển thị tab Đã nhận — khớp luồng: phân công → chờ lấy (MATCHED+xe/tx) → đang chạy (sau xác nhận lấy). */
export function claimedBucket(shipment: Shipment): ClaimedStatusKey {
  if (shipment.status === "CANCELLED") return "cancelled";
  if (shipment.status === "DELIVERY_CONFIRMED" || shipment.status === "COMPLETED") return "done";
  if (shipment.status === "PICKUP_CONFIRMED" || shipment.status === "IN_TRANSIT" || shipment.status === "INCIDENT") {
    return "running";
  }
  if (shipment.status === "MATCHED") {
    return isCarrierAssigned(shipment) ? "pickup" : "assign";
  }
  return "assign";
}

const filters: readonly {
  id: ClaimedStatusKey;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { id: "assign", label: "Phân công", icon: "clipboard-account-outline" },
  { id: "pickup", label: "Chờ lấy hàng", icon: "package-variant-closed" },
  { id: "running", label: "Đang chạy", icon: "truck-delivery-outline" },
  { id: "done", label: "Đã giao", icon: "star-outline" },
  { id: "cancelled", label: "Đã hủy", icon: "backup-restore" },
];

export function ClaimedStatusFilters({
  active,
  counts,
  onChange,
}: {
  active: ClaimedViewFilter;
  counts: Record<ClaimedStatusKey, number>;
  onChange: (id: ClaimedViewFilter) => void;
}) {
  const { colors } = useTheme();
  const total = counts.assign + counts.pickup + counts.running + counts.done + counts.cancelled;

  return (
    <View style={styles.wrap}>
    <View style={[styles.group, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      {filters.map((item, index) => {
        const selected = active === item.id;
        const badge = counts[item.id];
        const badgeText = badge > 9 ? "9+" : badge > 0 ? String(badge) : null;
        const last = index === filters.length - 1;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={badgeText ? `${item.label}, ${badge} chuyến` : item.label}
            onPress={() => onChange(selected ? "all" : item.id)}
            style={[
              styles.item,
              pointer,
              !last ? { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.line } : null,
              selected ? { backgroundColor: colors.badge } : null,
            ]}
          >
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name={item.icon} size={22} color={selected ? colors.primary : colors.ink} />
              {badgeText ? (
                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                  <Text maxFontSizeMultiplier={1.05} style={styles.badgeText}>{badgeText}</Text>
                </View>
              ) : null}
            </View>
            <Text
              maxFontSizeMultiplier={1.1}
              numberOfLines={2}
              style={[styles.label, { color: selected ? colors.primary : colors.muted, fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular" }]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
    {active !== "all" ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem tất cả, ${total} chuyến`}
        onPress={() => onChange("all")}
        style={[styles.pill, styles.viewAll, pointer, { borderColor: colors.line, backgroundColor: colors.surface }]}
      >
        <Text style={[styles.viewAllText, { color: colors.primary }]}>Xem tất cả ({total})</Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={colors.primary} />
      </Pressable>
    ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs, paddingVertical: space.xs },
  group: {
    flexDirection: "row",
    alignItems: "stretch",
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  pill: {
    borderWidth: 1,
    borderRadius: 10,
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 2,
    paddingVertical: space.xs,
    minHeight: 68,
    justifyContent: "center",
  },
  iconWrap: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 8, lineHeight: 10 },
  label: { fontSize: 9, lineHeight: 12, textAlign: "center" },
  viewAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minHeight: 38,
    paddingHorizontal: space.sm,
  },
  viewAllText: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
});

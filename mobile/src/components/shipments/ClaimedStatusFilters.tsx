import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { pointer } from "../../constants/hit";
import { space, useTheme } from "../../constants/theme";
import type { Shipment } from "../../types/shipment";

export type ClaimedStatusKey = "assign" | "running" | "done" | "cancelled";
export type ClaimedViewFilter = ClaimedStatusKey | "all";

export function claimedBucket(shipment: Shipment): ClaimedStatusKey {
  if (shipment.status === "CANCELLED" || shipment.status === "INCIDENT") return "cancelled";
  if (shipment.status === "DELIVERY_CONFIRMED" || shipment.status === "COMPLETED") return "done";
  if (shipment.status === "PICKUP_CONFIRMED" || shipment.status === "IN_TRANSIT") return "running";
  if (shipment.status === "MATCHED") return shipment.driverId ? "running" : "assign";
  return "assign";
}

const filters: readonly {
  id: ClaimedStatusKey;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { id: "assign", label: "Chờ phân công", icon: "clipboard-account-outline" },
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

  return (
    <View style={styles.row}>
      {filters.map((item) => {
        const selected = active === item.id;
        const badge = counts[item.id];
        const badgeText = badge > 9 ? "9+" : badge > 0 ? String(badge) : null;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={badgeText ? `${item.label}, ${badge} chuyến` : item.label}
            onPress={() => onChange(selected ? "all" : item.id)}
            style={[styles.item, pointer]}
          >
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name={item.icon} size={26} color={selected ? colors.primary : colors.ink} />
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
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: space.sm,
  },
  item: { flex: 1, minWidth: 0, alignItems: "center", gap: 6, paddingHorizontal: 2 },
  iconWrap: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: -2,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 9, lineHeight: 11 },
  label: { fontSize: 11, lineHeight: 14, textAlign: "center" },
});

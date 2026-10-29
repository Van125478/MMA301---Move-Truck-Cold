import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { pointer } from "../../constants/hit";
import { space, useTheme } from "../../constants/theme";

export type ShipperOrdersHubSection = "manage" | "find" | "tracking" | "payment" | "incidents";

const items: readonly {
  id: ShipperOrdersHubSection;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { id: "manage", label: "Đơn của bạn", icon: "clipboard-text-outline" },
  { id: "find", label: "Tìm đơn", icon: "magnify" },
  { id: "tracking", label: "Theo dõi\nđơn hàng", icon: "map-marker-path" },
  { id: "payment", label: "Thanh toán\nđơn", icon: "cash-multiple" },
  { id: "incidents", label: "Tra cứu\nsự cố", icon: "alert-circle-outline" },
];

export function ShipperOrdersHubFilters({
  active,
  counts,
  onChange,
}: {
  active: ShipperOrdersHubSection;
  counts: Record<ShipperOrdersHubSection, number>;
  onChange: (id: ShipperOrdersHubSection) => void;
}) {
  const { colors } = useTheme();
  const onSubView = active !== "manage";

  return (
    <View style={styles.wrap}>
      <Text maxFontSizeMultiplier={1.45} style={[styles.hint, { color: colors.muted }]}>
        Đơn của bạn, tìm đơn, theo dõi GPS, thanh toán cước đã giao, hoặc tra cứu sự cố.
      </Text>
      <View style={[styles.group, { borderColor: colors.line, backgroundColor: colors.surface }]}>
        {items.map((item, index) => {
          const selected = active === item.id;
          const badge = counts[item.id];
          const badgeText = badge > 9 ? "9+" : badge > 0 ? String(badge) : null;
          const last = index === items.length - 1;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={badgeText ? `${item.label}, ${badge}` : item.label}
              onPress={() => {
                if (item.id === "manage") {
                  onChange("manage");
                  return;
                }
                onChange(selected ? "manage" : item.id);
              }}
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
                    <Text maxFontSizeMultiplier={1.05} style={styles.badgeText}>
                      {badgeText}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                maxFontSizeMultiplier={1.1}
                numberOfLines={2}
                style={[
                  styles.label,
                  { color: selected ? colors.primary : colors.muted, fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular" },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {onSubView ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về đơn của bạn"
          onPress={() => onChange("manage")}
          style={[styles.pill, styles.viewAll, pointer, { borderColor: colors.line, backgroundColor: colors.surface }]}
        >
          <Text style={[styles.viewAllText, { color: colors.primary }]}>Về đơn của bạn</Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs, paddingVertical: space.xs },
  hint: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  group: {
    flexDirection: "row",
    alignItems: "stretch",
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  pill: { borderWidth: 1, borderRadius: 10 },
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

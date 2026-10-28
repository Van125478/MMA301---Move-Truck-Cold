import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { pointer } from "../../constants/hit";
import { space, useTheme } from "../../constants/theme";

export type CarrierBoardHubSection = "vehicles" | "drivers" | "transactions" | "incidents";

const items: readonly {
  id: CarrierBoardHubSection;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { id: "vehicles", label: "Quản lý xe", icon: "truck-outline" },
  { id: "drivers", label: "Quản lý tài xế", icon: "account-outline" },
  { id: "transactions", label: "Lịch sử giao dịch", icon: "history" },
  { id: "incidents", label: "Tra cứu sự cố", icon: "alert-circle-outline" },
];

export function CarrierBoardHubFilters({
  active,
  counts,
  onChange,
}: {
  active: CarrierBoardHubSection | null;
  counts: Record<CarrierBoardHubSection, number>;
  onChange: (id: CarrierBoardHubSection | null) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Text maxFontSizeMultiplier={1.45} style={[styles.hint, { color: colors.muted }]}>
        Bấm mục bên dưới để quản lý xe, tài xế, xem lịch sử giao dịch hoặc tra cứu sự cố. Bấm lại để về sàn chuyến.
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
              onPress={() => onChange(selected ? null : item.id)}
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
      {active ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về sàn chuyến"
          onPress={() => onChange(null)}
          style={[styles.pill, styles.viewAll, pointer, { borderColor: colors.line, backgroundColor: colors.surface }]}
        >
          <Text style={[styles.viewAllText, { color: colors.primary }]}>Về sàn chuyến</Text>
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
  label: { fontSize: 10, lineHeight: 13, textAlign: "center" },
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

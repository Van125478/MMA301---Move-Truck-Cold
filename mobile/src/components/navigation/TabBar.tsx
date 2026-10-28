import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pointer } from "../../constants/hit";
import { space, useTheme } from "../../constants/theme";

export type TabItem = {
  id: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  badgeCount?: number;
};

function badgeLabel(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? "9+" : String(count);
}

/** Icon đặc khi tab đang chọn — dễ thấy xanh navy như các mục khác. */
function iconWhenSelected(icon: TabItem["icon"], selected: boolean): TabItem["icon"] {
  if (!selected) return icon;
  if (icon.endsWith("-outline")) {
    const filled = icon.slice(0, -"-outline".length) as TabItem["icon"];
    if (filled in MaterialCommunityIcons.glyphMap) return filled;
  }
  return icon;
}

export function TabBar({ items, active, onChange }: { items: readonly TabItem[]; active: string; onChange: (id: string) => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          paddingBottom: Math.max(insets.bottom, space.sm),
          ...(Platform.OS === "android"
            ? { elevation: 12 }
            : {
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
              }),
        },
      ]}
    >
      {items.map((item) => {
        const selected = item.id === active;
        const color = selected ? colors.primary : colors.muted;
        const iconName = iconWhenSelected(item.icon, selected);
        const badge = badgeLabel(item.badgeCount ?? 0);
        const a11y = badge ? `${item.label}, ${item.badgeCount} mục đã lưu` : item.label;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={a11y}
            android_ripple={{ color: colors.line, borderless: false }}
            onPress={() => onChange(item.id)}
            style={({ pressed }) => [styles.tab, pointer, pressed && !selected ? styles.pressed : null]}
          >
            <View
              style={[
                styles.tabInner,
                selected ? { backgroundColor: colors.badge, borderColor: colors.line } : null,
              ]}
            >
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name={iconName} size={24} color={color} />
                {badge ? (
                  <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                    <Text maxFontSizeMultiplier={1.1} style={styles.badgeText}>
                      {badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                maxFontSizeMultiplier={1.2}
                numberOfLines={1}
                style={[styles.label, { color, fontFamily: selected ? "Inter_700Bold" : "Inter_600SemiBold" }]}
              >
                {item.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexShrink: 0, flexDirection: "row", borderTopWidth: 1, paddingTop: space.xs, paddingHorizontal: space.xs, zIndex: 20 },
  tab: { flex: 1, minHeight: 56, alignItems: "center", justifyContent: "center", paddingVertical: space.xs },
  tabInner: {
    width: "100%",
    maxWidth: 88,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },
  iconWrap: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: -2,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 10, lineHeight: 12 },
  pressed: { opacity: 0.72 },
  label: { fontSize: 11, lineHeight: 14 },
});

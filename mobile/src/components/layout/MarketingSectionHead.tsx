import { StyleSheet, Text, View } from "react-native";
import { space, useTheme } from "../../constants/theme";

export function MarketingSectionHead({ title, count }: { title: string; count: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text maxFontSizeMultiplier={1.25} style={[styles.title, { color: colors.ink }]}>
        {title}
      </Text>
      <View style={[styles.badge, { backgroundColor: colors.badge }]}>
        <Text maxFontSizeMultiplier={1.15} style={[styles.badgeText, { color: colors.badgeInk }]}>
          {count} đơn
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm, marginTop: space.sm },
  title: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 26 },
  badge: { flexShrink: 0, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 16 },
});

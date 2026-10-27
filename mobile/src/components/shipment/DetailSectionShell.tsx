import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { radius, space, useTheme } from "../../constants/theme";

export function DetailSectionShell({
  title,
  subtitle,
  icon,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accent?: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const tone = accent ?? colors.primary;
  return (
    <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      <View style={styles.head}>
        <View style={[styles.iconWrap, { backgroundColor: colors.badge }]}>
          <MaterialCommunityIcons name={icon} size={22} color={tone} />
        </View>
        <View style={styles.headText}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card, padding: space.lg, gap: space.md },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headText: { flex: 1, gap: 2 },
  title: { fontFamily: "Inter_700Bold", fontSize: 17, lineHeight: 24 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
});

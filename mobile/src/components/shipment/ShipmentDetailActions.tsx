import { Children, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DetailSectionShell } from "./DetailSectionShell";
import { pointer } from "../../constants/hit";
import { radius, space, useTheme } from "../../constants/theme";

export function ShipmentDetailActions({ children, footnote }: { children: ReactNode; footnote?: string }) {
  const { colors } = useTheme();
  const actions = Children.toArray(children).filter(Boolean);
  if (actions.length === 0 && !footnote) return null;
  return (
    <DetailSectionShell title="Thao tác" subtitle="Các bước tiếp theo trên chuyến này" icon="gesture-tap-button">
      <View style={styles.stack}>{actions}</View>
      {footnote ? <Text style={[styles.footnote, { color: colors.muted }]}>{footnote}</Text> : null}
    </DetailSectionShell>
  );
}

export function DangerLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.danger, pointer, { borderColor: colors.danger }]}>
      <Text style={[styles.dangerText, { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.sm },
  footnote: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  danger: { minHeight: 52, borderWidth: 1, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  dangerText: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24 },
});

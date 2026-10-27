import { StyleSheet, Text, View } from "react-native";
import { radius, space, useTheme, type Palette } from "../../constants/theme";
import type { ShipmentStatus } from "../../types/shipment";

type Tone = "neutral" | "success" | "warning" | "danger";

const toneByStatus: Record<ShipmentStatus, Tone> = {
  DRAFT: "neutral",
  PUBLISHED: "warning",
  MATCHED: "warning",
  PICKUP_CONFIRMED: "success",
  IN_TRANSIT: "success",
  DELIVERY_CONFIRMED: "success",
  COMPLETED: "success",
  INCIDENT: "danger",
  CANCELLED: "neutral",
};

function toneColors(colors: Palette, tone: Tone): { bg: string; ink: string } {
  if (tone === "success") return { bg: colors.successBg, ink: colors.successInk };
  if (tone === "warning") return { bg: colors.warningBg, ink: colors.warningInk };
  if (tone === "danger") return { bg: colors.dangerBg, ink: colors.dangerInk };
  return { bg: colors.neutralBg, ink: colors.neutralInk };
}

export function ShipmentStatusBadge({ status, label }: { status: ShipmentStatus; label: string }) {
  const { colors } = useTheme();
  const tone = toneColors(colors, toneByStatus[status]);
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, { color: tone.ink }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", borderRadius: radius.control, paddingHorizontal: space.md, paddingVertical: space.xs },
  text: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
});

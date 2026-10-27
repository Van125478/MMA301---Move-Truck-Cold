import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LocationMap } from "./LocationMap";
import { DetailSectionShell } from "./DetailSectionShell";
import { radius, space, useTheme } from "../../constants/theme";
import type { TrackingView } from "../../types/shipment";

export function ShipmentLocationSection({
  tracking,
  driverNote,
}: {
  tracking: TrackingView | null;
  driverNote?: boolean;
}) {
  const { colors } = useTheme();
  const phase = tracking?.phaseLabel ?? "Chưa xem được vị trí xe.";
  const hasPoint = tracking?.latitude != null && tracking.longitude != null;

  return (
    <DetailSectionShell title="Vị trí xe" subtitle="Theo dõi GPS khi chuyến đang chạy" icon="crosshairs-gps" accent={colors.success}>
      <View style={[styles.phase, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
        <MaterialCommunityIcons name="broadcast" size={18} color={colors.success} />
        <Text style={[styles.phaseText, { color: colors.success }]}>{phase}</Text>
      </View>
      {hasPoint ? (
        <LocationMap latitude={tracking!.latitude!} longitude={tracking!.longitude!} />
      ) : (
        <Text style={[styles.wait, { color: colors.muted }]}>Đang chờ tọa độ đầu tiên sau khi lấy hàng.</Text>
      )}
      {driverNote ? (
        <View style={[styles.note, { backgroundColor: colors.badge }]}>
          <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
          <Text style={[styles.noteText, { color: colors.ink }]}>
            Định vị đang được chia sẻ. Tài xế không tắt được. Chỉ dừng khi hàng đã giao.
          </Text>
        </View>
      ) : null}
    </DetailSectionShell>
  );
}

const styles = StyleSheet.create({
  phase: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  phaseText: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  wait: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  note: { flexDirection: "row", alignItems: "flex-start", gap: space.sm, borderRadius: radius.control, padding: space.md },
  noteText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
});

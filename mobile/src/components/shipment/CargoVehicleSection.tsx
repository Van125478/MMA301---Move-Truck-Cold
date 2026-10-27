import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DetailSectionShell } from "./DetailSectionShell";
import { radius, space, useTheme } from "../../constants/theme";
import type { Shipment, TemperatureGroup } from "../../types/shipment";

type TempVisual = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accent: string;
  soft: string;
};

const tempVisuals: Record<TemperatureGroup, TempVisual> = {
  COOL: { icon: "thermometer-low", accent: "#0369A1", soft: "#E0F2FE" },
  FROZEN: { icon: "snowflake", accent: "#1D4ED8", soft: "#DBEAFE" },
  DEEP_FROZEN: { icon: "snowflake-alert", accent: "#4338CA", soft: "#E0E7FF" },
};

export function CargoVehicleSection({ shipment }: { shipment: Shipment }) {
  const { colors } = useTheme();
  const temp = tempVisuals[shipment.temperatureGroup];
  const vehicleReq = shipment.vehicleRequirement?.trim() || "Xe lạnh";

  return (
    <DetailSectionShell title="Hàng và xe" subtitle="Nhiệt độ, khối lượng và xe được gán" icon="snowflake" accent={temp.accent}>
      <View style={[styles.tempBanner, { backgroundColor: temp.soft, borderColor: temp.accent }]}>
        <View style={[styles.tempIcon, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name={temp.icon} size={26} color={temp.accent} />
        </View>
        <View style={styles.tempText}>
          <Text style={[styles.tempKicker, { color: temp.accent }]}>Nhóm nhiệt</Text>
          <Text style={[styles.tempValue, { color: colors.ink }]}>{shipment.temperatureLabel}</Text>
        </View>
        <View style={[styles.reqPill, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="truck-outline" size={16} color={colors.primary} />
          <Text numberOfLines={2} style={[styles.reqText, { color: colors.ink }]}>{vehicleReq}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <MetricTile
          icon="weight-kilogram"
          label="Khối lượng"
          value={shipment.cargoWeightTon == null ? "—" : `${shipment.cargoWeightTon} t`}
          hint="tấn"
        />
        <MetricTile
          icon="cube-outline"
          label="Thể tích"
          value={shipment.cargoVolumeM3 == null ? "—" : String(shipment.cargoVolumeM3)}
          hint="m³"
        />
        <MetricTile
          icon="package-variant-closed"
          label="Số thùng"
          value={shipment.packageCount == null ? "—" : String(shipment.packageCount)}
          hint="thùng"
        />
      </View>

      {shipment.vehicleLabel || shipment.driverName ? (
        <View style={[styles.fleet, { backgroundColor: colors.badge, borderColor: colors.line }]}>
          <Text style={[styles.fleetTitle, { color: colors.primary }]}>Đội vận chuyển</Text>
          {shipment.vehicleLabel ? (
            <FleetRow icon="truck-check" label="Xe" value={shipment.vehicleLabel} />
          ) : null}
          {shipment.driverName ? (
            <FleetRow icon="account-circle-outline" label="Tài xế" value={shipment.driverName} />
          ) : null}
        </View>
      ) : null}
    </DetailSectionShell>
  );
}

function MetricTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  hint: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metric, { borderColor: colors.line, backgroundColor: colors.background }]}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.ink }]}>{value}</Text>
      <Text style={[styles.metricHint, { color: colors.hint }]}>{hint}</Text>
    </View>
  );
}

function FleetRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.fleetRow}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      <Text style={[styles.fleetLabel, { color: colors.muted }]}>{label}</Text>
      <Text numberOfLines={2} style={[styles.fleetValue, { color: colors.ink }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tempBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.md,
  },
  tempIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tempText: { flex: 1, gap: 2, minWidth: 0 },
  tempKicker: { fontFamily: "Inter_600SemiBold", fontSize: 11, lineHeight: 14, letterSpacing: 0.3, textTransform: "uppercase" },
  tempValue: { fontFamily: "Inter_700Bold", fontSize: 17, lineHeight: 24 },
  reqPill: {
    maxWidth: 108,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.control,
  },
  reqText: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 11, lineHeight: 15 },
  metrics: { flexDirection: "row", gap: space.sm },
  metric: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: space.sm,
    alignItems: "center",
    gap: 2,
    minHeight: 96,
    justifyContent: "center",
  },
  metricLabel: { fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 14, textAlign: "center" },
  metricValue: { fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 24 },
  metricHint: { fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 12 },
  fleet: { borderWidth: 1, borderRadius: radius.control, padding: space.md, gap: space.sm },
  fleetTitle: { fontFamily: "Inter_700Bold", fontSize: 13, lineHeight: 18, letterSpacing: 0.2 },
  fleetRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  fleetLabel: { width: 52, fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 20, paddingTop: 1 },
  fleetValue: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
});

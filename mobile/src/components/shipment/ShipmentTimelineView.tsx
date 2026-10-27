import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { space, useTheme } from "../../constants/theme";
import type { ShipmentTimeline, ShipmentTimelineEvent } from "../../types/shipment";

const iconByType: Record<ShipmentTimelineEvent["type"], keyof typeof MaterialCommunityIcons.glyphMap> = {
  PUBLISHED: "upload-outline",
  CLAIMED: "hand-back-right-outline",
  ASSIGNED: "truck-outline",
  PICKUP_CONFIRMED: "package-up",
  DELIVERY_CONFIRMED: "package-down",
  CANCELLED: "close-circle-outline",
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}, ${day}/${month}/${date.getFullYear()}`;
}

export function ShipmentTimelineView({ timeline }: { timeline: ShipmentTimeline }) {
  const { colors } = useTheme();

  if (timeline.events.length === 0) {
    return <Text style={[styles.note, { color: colors.muted }]}>Chưa có lịch sử cho đơn này.</Text>;
  }

  return (
    <View>
      {timeline.note ? (
        <View style={[styles.noteBox, { backgroundColor: colors.neutralBg }]}>
          <MaterialCommunityIcons name="information-outline" size={16} color={colors.neutralInk} />
          <Text style={[styles.noteText, { color: colors.neutralInk }]}>{timeline.note}</Text>
        </View>
      ) : null}
      {timeline.events.map((event, index) => {
        const isLast = index === timeline.events.length - 1;
        return (
          <View key={event.id} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: colors.primary, opacity: event.recorded ? 1 : 0.5 }]}>
                <MaterialCommunityIcons name={iconByType[event.type]} size={14} color={colors.onPrimary} />
              </View>
              {!isLast ? <View style={[styles.line, { backgroundColor: colors.line }]} /> : null}
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.label, { color: colors.ink }]}>{event.label}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>
                {event.actorLabel} · {formatDateTime(event.occurredAt)}
                {event.recorded ? "" : " (ước tính)"}
              </Text>
              {event.detail ? <Text style={[styles.detail, { color: colors.hint }]}>{event.detail}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  noteBox: { flexDirection: "row", gap: space.sm, padding: space.md, borderRadius: 10, marginBottom: space.md },
  noteText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  row: { flexDirection: "row" },
  rail: { alignItems: "center", width: 28 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  line: { flex: 1, width: 2, marginVertical: 2 },
  rowBody: { flex: 1, paddingBottom: space.lg, paddingLeft: space.sm },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18, marginTop: 2 },
  detail: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18, marginTop: 2 },
});

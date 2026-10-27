import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DetailSectionShell } from "./DetailSectionShell";
import { radius, space, useTheme } from "../../constants/theme";
import type { TimelineEvent } from "../../types/shipment";
import { formatWhen } from "../../utils/format";

export function ShipmentTimelineSection({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return null;
  return (
    <DetailSectionShell title="Mốc đã ghi" subtitle="Diễn biến trạng thái chuyến" icon="timeline-clock-outline">
      <View style={styles.list}>
        {events.map((event, index) => (
          <TimelineRow key={event.id} event={event} last={index === events.length - 1} />
        ))}
      </View>
    </DetailSectionShell>
  );
}

function TimelineRow({ event, last }: { event: TimelineEvent; last: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.node, { backgroundColor: colors.primary, borderColor: colors.badge }]} />
        {!last ? <View style={[styles.line, { backgroundColor: colors.line }]} /> : null}
      </View>
      <View style={[styles.content, { borderColor: colors.line, backgroundColor: colors.background }]}>
        <Text style={[styles.label, { color: colors.ink }]}>{event.label}</Text>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="calendar-clock" size={14} color={colors.muted} />
          <Text style={[styles.meta, { color: colors.muted }]}>
            {formatWhen(event.occurredAt)}
            {event.statusAfterLabel ? ` · ${event.statusAfterLabel}` : ""}
          </Text>
        </View>
        {event.detail ? <Text style={[styles.detail, { color: colors.muted }]}>{event.detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  row: { flexDirection: "row", gap: space.sm },
  rail: { width: 20, alignItems: "center" },
  node: { width: 12, height: 12, borderRadius: 6, borderWidth: 3 },
  line: { flex: 1, width: 2, marginTop: 4, minHeight: 24, borderRadius: 1 },
  content: { flex: 1, borderWidth: 1, borderRadius: radius.control, padding: space.md, gap: 4, marginBottom: space.xs },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  detail: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
});

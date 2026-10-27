import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ChoiceChip } from "../common/Feedback";
import { pointer } from "../../constants/hit";
import { radius, space, useTheme } from "../../constants/theme";
import { ApiError } from "../../services/api/client";
import { actOnIncident, createIncident, listIncidents, type IncidentRow } from "../../services/api/operations";
import type { UserRole } from "../../types/auth";

const types = [
  ["TEMPERATURE_ISSUE", "Nhiệt độ"],
  ["VEHICLE_ISSUE", "Phương tiện"],
  ["DELAY", "Chậm trễ"],
  ["CARGO_ISSUE", "Hàng hóa"],
  ["PICKUP_DELIVERY_ISSUE", "Lấy hoặc giao"],
  ["OTHER", "Khác"],
] as const;

export function ShipmentIncidents({ shipmentId, role }: { shipmentId: string; role: UserRole }) {
  const { colors } = useTheme();
  const [rows, setRows] = useState<IncidentRow[]>([]);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof types)[number][0]>("TEMPERATURE_ISSUE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await listIncidents(shipmentId));
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không tải được sự cố.");
    }
  }, [shipmentId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function submit() {
    setPending(true);
    setError(null);
    try {
      await createIncident(shipmentId, kind, title.trim(), description.trim());
      setTitle("");
      setDescription("");
      setOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không tạo được sự cố.");
    } finally {
      setPending(false);
    }
  }

  async function act(row: IncidentRow, action: "acknowledge" | "start" | "resolve" | "object") {
    setPending(true);
    setError(null);
    try {
      await actOnIncident(row.id, action, row.version, note.trim());
      setNote("");
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không cập nhật được sự cố.");
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.block}>
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.ink }]}>Sự cố</Text>
      <Text style={[styles.meta, { color: colors.muted }]}>Báo sự cố không đổi trạng thái chuyến và không dừng GPS.</Text>
      {error ? <Text style={[styles.meta, { color: colors.danger }]}>{error}</Text> : null}
      {rows.length === 0 ? <Text style={[styles.meta, { color: colors.muted }]}>Chưa có hồ sơ sự cố.</Text> : null}
      {rows.map((row) => (
        <View key={row.id} style={[styles.card, { borderColor: colors.line }]}>
          <Text style={[styles.body, { color: colors.ink }]}>{row.title}</Text>
          <Text style={[styles.meta, { color: colors.muted }]}>{row.incidentTypeLabel} · {row.statusLabel}</Text>
          <Text style={[styles.meta, { color: colors.ink }]}>{row.description}</Text>
          {role === "CARRIER" && row.status === "OPEN" ? <Action label="Tiếp nhận" onPress={() => void act(row, "acknowledge")} /> : null}
          {role === "CARRIER" && row.status === "ACKNOWLEDGED" ? <Action label="Bắt đầu xử lý" onPress={() => void act(row, "start")} /> : null}
          {role === "CARRIER" && row.status === "IN_PROGRESS" ? <Action label="Ghi kết quả" onPress={() => void act(row, "resolve")} /> : null}
          {role === "SHIPPER" && row.status === "RESOLVED" ? <Action label="Phản đối kết quả" onPress={() => void act(row, "object")} /> : null}
        </View>
      ))}
      {(role === "CARRIER" && rows.some((row) => row.status === "ACKNOWLEDGED" || row.status === "IN_PROGRESS" || row.status === "RESOLVED")) || (role === "SHIPPER" && rows.some((row) => row.status === "RESOLVED")) ? (
        <TextInput value={note} onChangeText={setNote} placeholder="Ghi chú, kết quả hoặc lý do phản đối" placeholderTextColor={colors.hint} style={[styles.input, { color: colors.ink, borderColor: colors.line }]} />
      ) : null}
      {open ? (
        <View style={styles.form}>
          <View style={styles.chips}>
            {types.map(([id, label]) => (
              <ChoiceChip key={id} label={label} selected={kind === id} onPress={() => setKind(id)} />
            ))}
          </View>
          <TextInput value={title} onChangeText={setTitle} placeholder="Tiêu đề, từ 5 ký tự" placeholderTextColor={colors.hint} style={[styles.input, { color: colors.ink, borderColor: colors.line }]} />
          <TextInput value={description} onChangeText={setDescription} placeholder="Mô tả, từ 20 ký tự" placeholderTextColor={colors.hint} multiline style={[styles.input, styles.area, { color: colors.ink, borderColor: colors.line }]} />
          <Action label={pending ? "Đang gửi…" : "Gửi báo cáo"} onPress={() => void submit()} />
        </View>
      ) : (
        <Action label="Báo sự cố" onPress={() => setOpen(true)} />
      )}
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.button, pointer, { borderColor: colors.primary }]}>
      <Text style={[styles.buttonText, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm },
  heading: { fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 26 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  body: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  card: { borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.xs },
  form: { gap: space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  input: { minHeight: 48, borderWidth: 1, borderRadius: radius.control, paddingHorizontal: space.md, fontFamily: "Inter_400Regular", fontSize: 16 },
  area: { minHeight: 88, paddingTop: space.sm, textAlignVertical: "top" },
  button: { minHeight: 44, borderWidth: 1, borderRadius: radius.control, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: space.lg },
  buttonText: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
});

import { useCallback, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { ConfirmDialog } from "../../components/common/Feedback";
import { Field } from "../../components/common/Field";
import { FieldError } from "../../components/common/FieldError";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { pointer } from "../../constants/hit";
import { panelChrome, radius, space, useTheme } from "../../constants/theme";
import { ApiError } from "../../services/api/client";
import { archiveVehicle, createDriver, createVehicle, pauseDriver, restoreVehicle, resumeDriver } from "../../services/api/operations";
import { loadFleet } from "../../services/api/shipments";
import type { FleetDriver, FleetVehicle } from "../../types/shipment";

type Mode = "list" | "vehicle" | "driver";
type Ask =
  | { kind: "pause-vehicle" | "resume-vehicle"; id: string; name: string }
  | { kind: "pause-driver" | "resume-driver"; id: string; name: string };

const previewCount = 3;

const vehicleKinds = [
  { value: "REEFER_TRUCK", label: "Tải lạnh" },
  { value: "REEFER_CONTAINER", label: "Container" },
  { value: "REEFER_VAN", label: "Van lạnh" },
] as const;

const temperatureGroups = [
  { value: "COOL", label: "Xe lạnh" },
  { value: "FROZEN", label: "Xe đông" },
  { value: "DEEP_FROZEN", label: "Cực lạnh" },
] as const;

export function FleetScreen() {
  const { colors } = useTheme();
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<Mode>("list");
  const [label, setLabel] = useState("");
  const [plate, setPlate] = useState("");
  const [kind, setKind] = useState("REEFER_TRUCK");
  const [temp, setTemp] = useState("FROZEN");
  const [tons, setTons] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [vehiclesExpanded, setVehiclesExpanded] = useState(false);
  const [driversExpanded, setDriversExpanded] = useState(false);

  const orderedVehicles = [...vehicles.filter((item) => item.status === "ACTIVE"), ...vehicles.filter((item) => item.status !== "ACTIVE")];
  const orderedDrivers = [...drivers.filter((item) => item.accountStatus === "ACTIVE"), ...drivers.filter((item) => item.accountStatus !== "ACTIVE")];
  const runningVehicles = vehicles.filter((item) => item.status === "ACTIVE").length;
  const runningDrivers = drivers.filter((item) => item.accountStatus === "ACTIVE").length;
  const visibleVehicles = orderedVehicles.length > previewCount && !vehiclesExpanded ? orderedVehicles.slice(0, previewCount) : orderedVehicles;
  const visibleDrivers = orderedDrivers.length > previewCount && !driversExpanded ? orderedDrivers.slice(0, previewCount) : orderedDrivers;

  const load = useCallback(async () => {
    try {
      const fleet = await loadFleet();
      setVehicles(fleet.vehicles);
      setDrivers(fleet.drivers);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không tải được đội xe.");
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function openMode(next: Mode) {
    setMode((current) => (current === next ? "list" : next));
    setFields({});
    setError(null);
  }

  async function saveVehicle() {
    const capacityTon = Number(tons.replace(",", "."));
    const nextFields: Record<string, string> = {};
    if (!label.trim()) nextFields.label = "Nhập tên xe.";
    if (!plate.trim()) nextFields.plate = "Nhập biển số.";
    if (!Number.isFinite(capacityTon) || capacityTon <= 0 || capacityTon > 100) nextFields.capacityTon = "Tải trọng phải lớn hơn 0 và không quá 100 tấn.";
    if (Object.keys(nextFields).length > 0) {
      setFields(nextFields);
      setError("Một số thông tin xe chưa hợp lệ.");
      return;
    }
    setPending(true);
    setError(null);
    setFields({});
    try {
      await createVehicle({ label: label.trim(), plate: plate.trim(), vehicleKind: kind, temperatureGroup: temp, capacityTon });
      setLabel("");
      setPlate("");
      setTons("");
      setMode("list");
      await load();
    } catch (caught) {
      setFields(fieldMap(caught));
      setError(caught instanceof ApiError ? caught.message : "Không thêm được xe.");
    } finally {
      setPending(false);
    }
  }

  async function saveDriver() {
    setPending(true);
    setError(null);
    setFields({});
    try {
      await createDriver({ displayName: name.trim(), username: username.trim().toLowerCase(), password, confirmPassword: confirm });
      setName("");
      setUsername("");
      setPassword("");
      setConfirm("");
      setMode("list");
      await load();
    } catch (caught) {
      setFields(fieldMap(caught));
      setError(caught instanceof ApiError ? caught.message : "Không tạo được tài xế.");
    } finally {
      setPending(false);
    }
  }

  async function applyAsk() {
    if (!ask) return;
    setPending(true);
    setError(null);
    try {
      if (ask.kind === "pause-vehicle") await archiveVehicle(ask.id);
      if (ask.kind === "resume-vehicle") await restoreVehicle(ask.id);
      if (ask.kind === "pause-driver") await pauseDriver(ask.id);
      if (ask.kind === "resume-driver") await resumeDriver(ask.id);
      setAsk(null);
      await load();
    } catch (caught) {
      setAsk(null);
      setError(actionError(caught));
    } finally {
      setPending(false);
    }
  }

  const askCopy = ask ? dialogCopy(ask) : null;

  return (
    <View style={styles.block}>
      <Text style={[styles.heading, { color: colors.ink }]}>Đội xe</Text>
      <Text style={[styles.summary, { color: colors.muted }]}>{runningVehicles} xe đang chạy · {runningDrivers} tài xế đang chạy</Text>
      {error ? <FieldError message={error} /> : null}

      <RosterPanel
        icon="truck-outline"
        title="Xe"
        subtitle={`${vehicles.length} trong đội`}
        addLabel={mode === "vehicle" ? "Đóng" : "Thêm xe"}
        adding={mode === "vehicle"}
        onToggleAdd={() => openMode("vehicle")}
      >
        {mode === "vehicle" ? (
          <View style={styles.form}>
            <Field label="Tên xe" value={label} onChangeText={setLabel} error={fields.label ?? null} maxLength={160} />
            <Field label="Biển số" value={plate} onChangeText={setPlate} error={fields.plate ?? null} autoCapitalize="characters" maxLength={20} />
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Loại xe</Text>
            <Segmented options={vehicleKinds} value={kind} onChange={setKind} />
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Nhóm nhiệt</Text>
            <Segmented options={temperatureGroups} value={temp} onChange={setTemp} />
            <Field label="Tải trọng (tấn)" value={tons} onChangeText={setTons} error={fields.capacityTon ?? null} keyboardType="decimal-pad" />
            <PrimaryButton spaced={false} label="Lưu xe" pending={pending} onPress={() => void saveVehicle()} />
          </View>
        ) : null}
        {visibleVehicles.length === 0 ? (
          <EmptyRoster icon="truck-outline" label="Chưa có xe. Bấm Thêm xe để đưa xe vào đội." />
        ) : (
          visibleVehicles.map((vehicle, index) => {
            const paused = vehicle.status === "ARCHIVED";
            const blocked = !paused && !vehicle.canPause;
            return (
              <View key={vehicle.id} style={[styles.row, index > 0 || mode === "vehicle" ? styles.rowSplit : null, index > 0 || mode === "vehicle" ? { borderTopColor: colors.line } : null]}>
                <Text numberOfLines={2} style={[styles.rowTitle, { color: paused ? colors.muted : colors.ink }]}>{vehicle.label}</Text>
                <Text numberOfLines={1} style={[styles.plate, { color: colors.ink }]}>{vehicle.plate ?? "Chưa có biển số"}</Text>
                <View style={styles.facts}>
                  {vehicle.vehicleKindLabel ? <FactChip label={vehicle.vehicleKindLabel} /> : null}
                  {vehicle.temperatureLabel ? <FactChip label={vehicle.temperatureLabel} /> : null}
                  {vehicle.capacityTon != null ? <FactChip label={tonsLabel(vehicle.capacityTon)} /> : null}
                </View>
                <View style={styles.footer}>
                  <ActivityPill paused={paused} />
                  {blocked ? null : (
                    <RowAction
                      label={paused ? "Hoạt động lại" : "Tạm dừng"}
                      tone={paused ? "primary" : "danger"}
                      disabled={pending}
                      onPress={() => setAsk({
                        kind: paused ? "resume-vehicle" : "pause-vehicle",
                        id: vehicle.id,
                        name: vehicle.label,
                      })}
                    />
                  )}
                </View>
                {blocked ? <Text style={[styles.note, { color: colors.muted }]}>{vehicle.pauseBlockReason ?? "Xe đang trong chuyến, chưa tạm dừng được."}</Text> : null}
              </View>
            );
          })
        )}
        {orderedVehicles.length > previewCount ? (
          <ExpandToggle expanded={vehiclesExpanded} hidden={orderedVehicles.length - previewCount} onPress={() => setVehiclesExpanded((value) => !value)} />
        ) : null}
      </RosterPanel>

      <RosterPanel
        icon="account-outline"
        title="Tài xế"
        subtitle={`${drivers.length} trong đội`}
        addLabel={mode === "driver" ? "Đóng" : "Thêm tài xế"}
        adding={mode === "driver"}
        onToggleAdd={() => openMode("driver")}
      >
        {mode === "driver" ? (
          <View style={styles.form}>
            <Field label="Tên hiển thị" value={name} onChangeText={setName} error={fields.displayName ?? null} maxLength={80} />
            <Field label="Tên đăng nhập" value={username} onChangeText={setUsername} error={fields.username ?? null} autoCapitalize="none" maxLength={32} />
            <Field label="Mật khẩu" value={password} onChangeText={setPassword} error={fields.password ?? null} secureTextEntry />
            <Field label="Nhập lại mật khẩu" value={confirm} onChangeText={setConfirm} error={fields.confirmPassword ?? null} secureTextEntry />
            <PrimaryButton spaced={false} label="Tạo tài xế" pending={pending} onPress={() => void saveDriver()} />
          </View>
        ) : null}
        {visibleDrivers.length === 0 ? (
          <EmptyRoster icon="account-outline" label="Chưa có tài xế." />
        ) : (
          visibleDrivers.map((driver, index) => {
            const paused = driver.accountStatus === "LOCKED";
            return (
              <View key={driver.id} style={[styles.row, index > 0 || mode === "driver" ? styles.rowSplit : null, index > 0 || mode === "driver" ? { borderTopColor: colors.line } : null]}>
                <Text numberOfLines={2} style={[styles.rowTitle, { color: paused ? colors.muted : colors.ink }]}>{driver.name}</Text>
                <Text numberOfLines={1} style={[styles.plate, { color: colors.muted }]}>{driver.username ? `@${driver.username}` : "Tài xế đội"}</Text>
                <View style={styles.footer}>
                  <ActivityPill paused={paused} />
                  <RowAction
                    label={paused ? "Hoạt động lại" : "Tạm dừng"}
                    tone={paused ? "primary" : "danger"}
                    disabled={pending}
                    onPress={() => setAsk({ kind: paused ? "resume-driver" : "pause-driver", id: driver.id, name: driver.name })}
                  />
                </View>
              </View>
            );
          })
        )}
        {orderedDrivers.length > previewCount ? (
          <ExpandToggle expanded={driversExpanded} hidden={orderedDrivers.length - previewCount} onPress={() => setDriversExpanded((value) => !value)} />
        ) : null}
      </RosterPanel>

      <ConfirmDialog
        visible={ask !== null}
        title={askCopy?.title ?? "Cập nhật đội xe?"}
        body={askCopy?.body ?? ""}
        confirmLabel={pending ? "Đang xử lý…" : (askCopy?.confirm ?? "Xác nhận")}
        tone={ask?.kind.startsWith("pause") ? "danger" : "primary"}
        pending={pending}
        onCancel={() => { if (!pending) setAsk(null); }}
        onConfirm={() => void applyAsk()}
      />
    </View>
  );
}

function RosterPanel({
  icon,
  title,
  subtitle,
  addLabel,
  adding,
  onToggleAdd,
  children,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
  addLabel: string;
  adding: boolean;
  onToggleAdd: () => void;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.panel, panelChrome(colors)]}>
      <View style={styles.panelHead}>
        <View style={[styles.mark, { backgroundColor: colors.badge }]}>
          <MaterialCommunityIcons name={icon} size={20} color={colors.badgeInk} />
        </View>
        <View style={styles.panelTitles}>
          <Text style={[styles.panelTitle, { color: colors.ink }]}>{title}</Text>
          <Text numberOfLines={1} style={[styles.panelSubtitle, { color: colors.muted }]}>{subtitle}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={addLabel}
          onPress={onToggleAdd}
          style={[styles.add, pointer, { backgroundColor: adding ? colors.field : colors.badge }]}
        >
          <MaterialCommunityIcons name={adding ? "close" : "plus"} size={16} color={colors.primary} />
          <Text style={[styles.addText, { color: colors.primary }]}>{addLabel}</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

function Segmented({ options, value, onChange }: { options: readonly { value: string; label: string }[]; value: string; onChange: (value: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.segment}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={[styles.segmentItem, pointer, { backgroundColor: selected ? colors.primary : colors.field, borderColor: selected ? colors.primary : colors.line }]}
          >
            <Text numberOfLines={1} style={[styles.segmentText, { color: selected ? colors.onPrimary : colors.ink }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FactChip({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.fact, { backgroundColor: colors.field }]}>
      <Text numberOfLines={1} style={[styles.factText, { color: colors.ink }]}>{label}</Text>
    </View>
  );
}

function ActivityPill({ paused }: { paused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: paused ? colors.warningBg : colors.successBg }]}>
      <Text style={[styles.pillText, { color: paused ? colors.warning : colors.success }]}>{paused ? "Tạm dừng" : "Đang chạy"}</Text>
    </View>
  );
}

function RowAction({ label, tone, disabled, onPress }: { label: string; tone: "primary" | "danger"; disabled: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const ink = tone === "danger" ? colors.danger : colors.primary;
  const fill = tone === "danger" ? colors.dangerBg : colors.badge;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, pointer, { backgroundColor: fill, opacity: disabled ? 0.6 : 1 }]}
    >
      <Text style={[styles.actionText, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}

function EmptyRoster({ icon, label }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: colors.field }]}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.hint} />
      <Text style={[styles.emptyText, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function ExpandToggle({ expanded, hidden, onPress }: { expanded: boolean; hidden: number; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={expanded ? "Thu gọn" : `Xem thêm ${hidden}`} onPress={onPress} style={[styles.more, pointer]}>
      <Text style={[styles.moreText, { color: colors.primary }]}>{expanded ? "Thu gọn" : `Xem thêm (${hidden})`}</Text>
      <MaterialCommunityIcons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.primary} />
    </Pressable>
  );
}

function tonsLabel(value: number): string {
  const shown = Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
  return `${shown} tấn`;
}

function dialogCopy(ask: Ask): { title: string; body: string; confirm: string } {
  if (ask.kind === "pause-vehicle") {
    return {
      title: `Tạm dừng ${ask.name}?`,
      body: "Xe tạm dừng sẽ không được phân công. Bấm Hoạt động lại khi muốn dùng tiếp.",
      confirm: "Tạm dừng",
    };
  }
  if (ask.kind === "resume-vehicle") {
    return {
      title: `Cho ${ask.name} hoạt động lại?`,
      body: "Xe hoạt động lại và có thể nhận chuyến, nếu gói còn suất xe.",
      confirm: "Hoạt động lại",
    };
  }
  if (ask.kind === "pause-driver") {
    return {
      title: `Tạm dừng ${ask.name}?`,
      body: "Tài xế tạm dừng sẽ không đăng nhập và không được phân công. Bấm Hoạt động lại khi muốn dùng tiếp.",
      confirm: "Tạm dừng",
    };
  }
  return {
    title: `Cho ${ask.name} hoạt động lại?`,
    body: "Tài xế hoạt động lại, đăng nhập và nhận chuyến được.",
    confirm: "Hoạt động lại",
  };
}

function actionError(caught: unknown): string {
  if (!(caught instanceof ApiError)) return "Không cập nhật được đội xe.";
  if (caught.code === "vehicle_on_unfinished_trip") return "Xe đang trong chuyến, chưa tạm dừng được.";
  if (caught.message.includes("Không khóa được tài xế")) return "Tài xế đang trong chuyến, chưa tạm dừng được.";
  if (caught.message.includes("đã khóa")) return "Tài xế đang tạm dừng.";
  if (caught.message.includes("đang mở")) return "Tài xế đang chạy.";
  return caught.message;
}

function fieldMap(caught: unknown): Record<string, string> {
  if (!(caught instanceof ApiError) || !caught.fields) return {};
  return { ...caught.fields };
}

const styles = StyleSheet.create({
  block: { marginTop: space.xl, gap: space.md },
  heading: { fontFamily: "Inter_700Bold", fontSize: 20, lineHeight: 28 },
  summary: { marginTop: -space.sm, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  panel: { padding: space.lg, gap: space.md },
  panelHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  mark: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  panelTitles: { flex: 1, minWidth: 0, gap: 2 },
  panelTitle: { fontFamily: "Inter_700Bold", fontSize: 17, lineHeight: 24 },
  panelSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  add: { flexShrink: 0, flexDirection: "row", alignItems: "center", gap: 4, minHeight: 36, paddingHorizontal: space.md, borderRadius: radius.pill },
  addText: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  form: { gap: space.sm },
  fieldLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  segment: { flexDirection: "row", gap: space.sm },
  segmentItem: { flex: 1, minHeight: 40, paddingHorizontal: 4, borderWidth: 1, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  segmentText: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  empty: { borderRadius: radius.control, paddingVertical: space.lg, paddingHorizontal: space.md, alignItems: "center", gap: space.sm },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18, textAlign: "center" },
  row: { gap: space.sm },
  rowSplit: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md },
  rowTitle: { fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 22 },
  plate: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20 },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  fact: { maxWidth: "100%", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  factText: { fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 16 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm, minHeight: 36 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 16 },
  action: { minHeight: 36, paddingHorizontal: space.md, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  actionText: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  note: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  more: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, minHeight: 36 },
  moreText: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
});

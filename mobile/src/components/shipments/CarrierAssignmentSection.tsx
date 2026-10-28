import { useMemo, useState } from "react";
import { Dimensions, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FieldError } from "../common/FieldError";
import { SearchField } from "../common/Feedback";
import { PrimaryButton } from "../common/PrimaryButton";
import { pointer } from "../../constants/hit";
import { radius, space, useTheme } from "../../constants/theme";
import type { FleetDriver, FleetVehicle } from "../../types/shipment";

type PickerKind = "vehicle" | "driver";

function vehicleTitle(vehicle: FleetVehicle): string {
  return vehicle.plate ? `${vehicle.label} · ${vehicle.plate}` : vehicle.label;
}

function vehicleStateLabel(vehicle: FleetVehicle): string {
  if (vehicle.status === "ARCHIVED") return "Tạm dừng";
  return vehicle.availableForAssignment ? "Rảnh" : "Đang bận";
}

function driverStateLabel(driver: FleetDriver): string {
  if (driver.accountStatus === "LOCKED") return "Tạm dừng";
  if (!driverReady(driver)) return "Chưa phân công được";
  if (!driver.availableForAssignment) return driver.assignmentBlockReason ?? "Đang bận";
  return "Sẵn sàng";
}

function driverReady(driver: FleetDriver): boolean {
  return driver.accountStatus === "ACTIVE" && !driver.mustChangePassword && driver.availableForAssignment;
}

function driverSelectable(driver: FleetDriver): boolean {
  return driver.accountStatus === "ACTIVE" && !driver.mustChangePassword && driver.availableForAssignment;
}

function matchQuery(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return text.toLowerCase().includes(q);
}

export function CarrierAssignmentSection({
  vehicles,
  drivers,
  vehicleId,
  driverId,
  fleetNote,
  onSelectVehicle,
  onSelectDriver,
  onAssign,
}: {
  vehicles: FleetVehicle[];
  drivers: FleetDriver[];
  vehicleId: string | null;
  driverId: string | null;
  fleetNote: string | null;
  onSelectVehicle: (id: string) => void;
  onSelectDriver: (id: string) => void;
  onAssign: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const [query, setQuery] = useState("");

  const selectedVehicle = vehicles.find((row) => row.id === vehicleId) ?? null;
  const selectedDriver = drivers.find((row) => row.id === driverId) ?? null;
  const availableVehicleCount = vehicles.filter((row) => row.availableForAssignment).length;
  const readyDriverCount = drivers.filter(driverSelectable).length;
  const pickerListMaxHeight = Dimensions.get("window").height * 0.42;

  const sortedVehicles = useMemo(
    () =>
      [...vehicles].sort((left, right) => {
        if (left.availableForAssignment === right.availableForAssignment) return left.label.localeCompare(right.label);
        return left.availableForAssignment ? -1 : 1;
      }),
    [vehicles],
  );

  const filteredVehicles = useMemo(
    () => sortedVehicles.filter((row) => matchQuery(`${vehicleTitle(row)} ${row.temperatureLabel ?? ""}`, query)),
    [query, sortedVehicles],
  );

  const sortedDrivers = useMemo(
    () =>
      [...drivers].sort((left, right) => {
        const leftOk = driverSelectable(left);
        const rightOk = driverSelectable(right);
        if (leftOk === rightOk) return left.name.localeCompare(right.name);
        return leftOk ? -1 : 1;
      }),
    [drivers],
  );

  const filteredDrivers = useMemo(
    () => sortedDrivers.filter((row) => matchQuery(row.name, query)),
    [query, sortedDrivers],
  );

  function openPicker(kind: PickerKind) {
    setQuery("");
    setPicker(kind);
  }

  function closePicker() {
    setPicker(null);
    setQuery("");
  }

  return (
    <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>Phân công chuyến</Text>
      <Text style={[styles.lede, { color: colors.muted }]}>Bấm từng dòng để chọn xe và tài xế trong danh sách gọn.</Text>
      {fleetNote ? <FieldError message={fleetNote} /> : null}

      <PickerRow
        step={1}
        enabled
        icon="truck-outline"
        label="Xe"
        value={selectedVehicle ? vehicleTitle(selectedVehicle) : "Chọn xe đang rảnh"}
        hint={
          selectedVehicle
            ? vehicleStateLabel(selectedVehicle)
            : vehicles.length > 0
              ? `${availableVehicleCount} rảnh / ${vehicles.length} xe`
              : "Chưa có xe"
        }
        onPress={() => openPicker("vehicle")}
      />

      <PickerRow
        step={2}
        enabled={Boolean(vehicleId)}
        icon="account-outline"
        label="Tài xế"
        value={selectedDriver ? selectedDriver.name : vehicleId ? "Chọn tài xế" : "Chọn xe trước"}
        hint={
          selectedDriver
            ? driverStateLabel(selectedDriver)
            : vehicleId && drivers.length > 0
              ? `${readyDriverCount} sẵn sàng`
              : vehicleId
                ? "Chưa có tài xế"
                : "Bước 2"
        }
        onPress={() => {
          if (vehicleId) openPicker("driver");
        }}
      />

      <PrimaryButton spaced={false} label="Phân công" disabled={!vehicleId || !driverId} onPress={onAssign} />

      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={closePicker}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={closePicker} style={styles.backdrop}>
          <View
            accessibilityViewIsModal
            style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + space.md }]}
          >
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { color: colors.ink }]}>{picker === "vehicle" ? "Chọn xe" : "Chọn tài xế"}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={closePicker} hitSlop={8} style={pointer}>
                <MaterialCommunityIcons name="close" size={24} color={colors.ink} />
              </Pressable>
            </View>
            <SearchField
              hideLabel
              label={picker === "vehicle" ? "Tìm xe" : "Tìm tài xế"}
              placeholder={picker === "vehicle" ? "Tên xe, biển số, nhóm nhiệt" : "Tên tài xế"}
              value={query}
              onChangeText={setQuery}
            />
            {picker === "vehicle" ? (
              <FlatList
                data={filteredVehicles}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: pickerListMaxHeight }}
                ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>Không có xe khớp tìm kiếm.</Text>}
                renderItem={({ item }) => {
                  const available = item.availableForAssignment;
                  const selected = vehicleId === item.id;
                  const subtitle = [item.temperatureLabel, vehicleStateLabel(item)].filter(Boolean).join(" · ");
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: !available }}
                      disabled={!available}
                      onPress={() => {
                        onSelectVehicle(item.id);
                        closePicker();
                      }}
                      style={[
                        styles.sheetRow,
                        pointer,
                        {
                          borderColor: selected ? colors.primary : colors.line,
                          backgroundColor: selected ? colors.badge : colors.background,
                          opacity: available ? 1 : 0.5,
                        },
                      ]}
                    >
                      <View style={styles.sheetRowText}>
                        <Text numberOfLines={2} style={[styles.rowLabel, { color: colors.ink }]}>{vehicleTitle(item)}</Text>
                        <Text style={[styles.rowMeta, { color: colors.muted }]}>{subtitle}</Text>
                      </View>
                      {selected ? <MaterialCommunityIcons name="check" size={22} color={colors.primary} /> : null}
                    </Pressable>
                  );
                }}
              />
            ) : (
              <FlatList
                data={filteredDrivers}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: pickerListMaxHeight }}
                ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>Không có tài xế khớp tìm kiếm.</Text>}
                renderItem={({ item }) => {
                  const ready = driverSelectable(item);
                  const selected = driverId === item.id;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: !ready }}
                      disabled={!ready}
                      onPress={() => {
                        onSelectDriver(item.id);
                        closePicker();
                      }}
                      style={[
                        styles.sheetRow,
                        pointer,
                        {
                          borderColor: selected ? colors.primary : colors.line,
                          backgroundColor: selected ? colors.badge : colors.background,
                          opacity: ready ? 1 : 0.5,
                        },
                      ]}
                    >
                      <View style={styles.sheetRowText}>
                        <Text numberOfLines={1} style={[styles.rowLabel, { color: colors.ink }]}>{item.name}</Text>
                        <Text style={[styles.rowMeta, { color: colors.muted }]}>{driverStateLabel(item)}</Text>
                      </View>
                      {selected ? <MaterialCommunityIcons name="check" size={22} color={colors.primary} /> : null}
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function PickerRow({
  step,
  enabled,
  icon,
  label,
  value,
  hint,
  onPress,
}: {
  step: number;
  enabled: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  hint: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.stepBlock}>
      <View style={styles.step}>
        <View style={[styles.stepBadge, { backgroundColor: enabled ? colors.badge : colors.line }]}>
          <Text style={[styles.stepBadgeText, { color: enabled ? colors.primary : colors.muted }]}>{step}</Text>
        </View>
        <Text style={[styles.stepTitle, { color: enabled ? colors.ink : colors.muted }]}>{label}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !enabled }}
        disabled={!enabled}
        onPress={onPress}
        style={[
          styles.picker,
          pointer,
          {
            borderColor: colors.line,
            backgroundColor: colors.background,
            opacity: enabled ? 1 : 0.6,
          },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={22} color={enabled ? colors.primary : colors.muted} />
        <View style={styles.pickerText}>
          <Text numberOfLines={1} style={[styles.pickerValue, { color: colors.ink }]}>{value}</Text>
          <Text numberOfLines={1} style={[styles.rowMeta, { color: colors.muted }]}>{hint}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={22} color={colors.hint} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card, padding: space.lg, gap: space.md },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 26 },
  lede: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  stepBlock: { gap: space.sm },
  step: { flexDirection: "row", alignItems: "center", gap: space.sm },
  stepBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepBadgeText: { fontFamily: "Inter_700Bold", fontSize: 12, lineHeight: 14 },
  stepTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 52,
  },
  pickerText: { flex: 1, gap: 2, minWidth: 0 },
  pickerValue: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  rowLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  rowMeta: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.45)" },
  sheet: {
    maxHeight: "72%",
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.md,
  },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 26 },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginBottom: space.sm,
    minHeight: 52,
  },
  sheetRowText: { flex: 1, gap: 2, minWidth: 0 },
  empty: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, textAlign: "center", paddingVertical: space.lg },
});

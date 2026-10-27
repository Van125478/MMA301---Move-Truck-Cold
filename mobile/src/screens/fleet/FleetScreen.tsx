import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { ChoiceChip } from "../../components/common/Feedback";
import { Field } from "../../components/common/Field";
import { FieldError } from "../../components/common/FieldError";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { pointer } from "../../constants/hit";
import { elevatedCard, radius, space, useTheme } from "../../constants/theme";
import { ApiError } from "../../services/api/client";
import { loadFleet } from "../../services/api/shipments";
import { archiveVehicle, createDriver, createVehicle } from "../../services/api/operations";
import type { FleetDriver, FleetVehicle } from "../../types/shipment";

export function FleetScreen() {
  const { colors } = useTheme();
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "vehicle" | "driver">("list");
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

  async function saveVehicle() {
    const capacityTon = Number(tons.replace(",", "."));
    if (!label.trim() || !plate.trim() || !Number.isFinite(capacityTon) || capacityTon <= 0) {
      setError("Nhập tên xe, biển số và tải trọng lớn hơn 0.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await createVehicle({ label: label.trim(), plate: plate.trim(), vehicleKind: kind, temperatureGroup: temp, capacityTon });
      setLabel("");
      setPlate("");
      setTons("");
      setMode("list");
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không thêm được xe.");
    } finally {
      setPending(false);
    }
  }

  async function saveDriver() {
    setPending(true);
    setError(null);
    try {
      await createDriver({ displayName: name.trim(), username: username.trim().toLowerCase(), password, confirmPassword: confirm });
      setName("");
      setUsername("");
      setPassword("");
      setConfirm("");
      setMode("list");
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không tạo được tài xế.");
    } finally {
      setPending(false);
    }
  }

  async function archive(id: string) {
    setPending(true);
    setError(null);
    try {
      await archiveVehicle(id);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không lưu trữ được xe.");
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.block}>
      <View style={styles.head}>
        <Text style={[styles.heading, { color: colors.ink }]}>Đội xe</Text>
        <Text style={[styles.count, { color: colors.muted }]}>{vehicles.filter((item) => item.status === "ACTIVE").length} xe đang dùng</Text>
      </View>
      {error ? <FieldError message={error} /> : null}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Thêm xe" onPress={() => setMode(mode === "vehicle" ? "list" : "vehicle")} style={[styles.action, pointer, elevatedCard(colors)]}>
          <MaterialCommunityIcons name="truck-plus-outline" size={22} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.ink }]}>Thêm xe</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Tạo tài xế" onPress={() => setMode(mode === "driver" ? "list" : "driver")} style={[styles.action, pointer, elevatedCard(colors)]}>
          <MaterialCommunityIcons name="account-plus-outline" size={22} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.ink }]}>Tạo tài xế</Text>
        </Pressable>
      </View>
      {mode === "vehicle" ? (
        <View style={[styles.form, elevatedCard(colors)]}>
          <Field label="Tên xe" value={label} onChangeText={setLabel} error={null} />
          <Field label="Biển số" value={plate} onChangeText={setPlate} error={null} autoCapitalize="characters" />
          <View style={styles.chips}>
            <ChoiceChip label="Tải lạnh" selected={kind === "REEFER_TRUCK"} onPress={() => setKind("REEFER_TRUCK")} />
            <ChoiceChip label="Container" selected={kind === "REEFER_CONTAINER"} onPress={() => setKind("REEFER_CONTAINER")} />
            <ChoiceChip label="Van lạnh" selected={kind === "REEFER_VAN"} onPress={() => setKind("REEFER_VAN")} />
          </View>
          <View style={styles.chips}>
            <ChoiceChip label="Xe lạnh" selected={temp === "COOL"} onPress={() => setTemp("COOL")} />
            <ChoiceChip label="Xe đông" selected={temp === "FROZEN"} onPress={() => setTemp("FROZEN")} />
            <ChoiceChip label="Cực lạnh" selected={temp === "DEEP_FROZEN"} onPress={() => setTemp("DEEP_FROZEN")} />
          </View>
          <Field label="Tải trọng (tấn)" value={tons} onChangeText={setTons} error={null} keyboardType="decimal-pad" />
          <PrimaryButton spaced={false} label="Lưu xe" pending={pending} onPress={() => void saveVehicle()} />
        </View>
      ) : null}
      {mode === "driver" ? (
        <View style={[styles.form, elevatedCard(colors)]}>
          <Field label="Tên hiển thị" value={name} onChangeText={setName} error={null} />
          <Field label="Tên đăng nhập" value={username} onChangeText={setUsername} error={null} autoCapitalize="none" />
          <Field label="Mật khẩu" value={password} onChangeText={setPassword} error={null} secureTextEntry />
          <Field label="Nhập lại mật khẩu" value={confirm} onChangeText={setConfirm} error={null} secureTextEntry />
          <PrimaryButton spaced={false} label="Tạo tài xế" pending={pending} onPress={() => void saveDriver()} />
        </View>
      ) : null}
      {vehicles.map((vehicle) => (
        <View key={vehicle.id} style={[styles.card, elevatedCard(colors)]}>
          <View style={[styles.mark, { backgroundColor: colors.badge }]}>
            <MaterialCommunityIcons name="truck-outline" size={22} color={colors.badgeInk} />
          </View>
          <View style={styles.cardBody}>
            <Text numberOfLines={1} style={[styles.cardTitle, { color: colors.ink }]}>{vehicle.label}</Text>
            <Text numberOfLines={1} style={[styles.cardMeta, { color: colors.muted }]}>
              {vehicle.plate ?? "Chưa có biển số"} · {vehicle.statusLabel}
            </Text>
          </View>
          {vehicle.status === "ACTIVE" ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Lưu trữ ${vehicle.label}`} onPress={() => void archive(vehicle.id)} style={[styles.archive, pointer]}>
              <Text style={[styles.archiveText, { color: colors.primary }]}>Lưu trữ</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      {drivers.map((driver) => (
        <View key={driver.id} style={[styles.card, elevatedCard(colors)]}>
          <View style={[styles.mark, { backgroundColor: colors.field }]}>
            <MaterialCommunityIcons name="account-outline" size={22} color={colors.ink} />
          </View>
          <View style={styles.cardBody}>
            <Text numberOfLines={1} style={[styles.cardTitle, { color: colors.ink }]}>{driver.name}</Text>
            <Text style={[styles.cardMeta, { color: colors.muted }]}>Tài xế</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.md },
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  heading: { fontFamily: "Inter_700Bold", fontSize: 20, lineHeight: 28 },
  count: { fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: "row", gap: space.sm },
  action: { flex: 1, minHeight: 72, alignItems: "center", justifyContent: "center", gap: 6, padding: space.md },
  actionText: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  form: { padding: space.lg, gap: space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  card: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md },
  mark: { width: 44, height: 44, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 22 },
  cardMeta: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  archive: { minHeight: 36, justifyContent: "center", paddingHorizontal: space.sm },
  archiveText: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
});

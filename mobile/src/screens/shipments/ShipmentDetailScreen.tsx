import { useCallback, useRef, useState, type ReactNode } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConfirmDialog, ErrorState, LoadingBlock, StatusPill } from "../../components/common/Feedback";
import { AssignmentSuccessSheet } from "../../components/shipments/AssignmentSuccessSheet";
import { CarrierAssignmentSection } from "../../components/shipments/CarrierAssignmentSection";
import { PhoneFrame } from "../../components/common/PhoneFrame";
import { FieldError } from "../../components/common/FieldError";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { pointer } from "../../constants/hit";
import { radius, space, useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import { useFavorites } from "../../features/favorites/FavoritesProvider";
import type { RootStackParamList } from "../../navigation/types";
import { ApiError } from "../../services/api/client";
import {
  assignShipment,
  cancelShipment,
  claimShipment,
  confirmDelivery,
  confirmPickup,
  loadFleet,
  loadShipment,
  loadTracking,
  reportDriverLocation,
} from "../../services/api/shipments";
import { readDeviceFix } from "../../services/location/deviceFix";
import type { FleetDriver, FleetVehicle, Shipment, TrackingView } from "../../types/shipment";
import { ReviewSection } from "../../components/shipment/ReviewSection";
import { cargoHeroImage } from "../../utils/cargoHeroImage";
import { formatVnd, formatWhen, formatWindow } from "../../utils/format";

type Action = "cancel" | "claim" | "assign" | "pickup" | "delivery";

type DetailPresentation = "stack" | "embedded";

function ShipmentDetailBody({
  shipmentId,
  presentation,
  onClose,
}: {
  shipmentId: string;
  presentation: DetailPresentation;
  onClose?: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const stackPaddingTop = presentation === "stack" ? insets.top : 0;
  const scrollBottomPad = presentation === "embedded" ? space.xxl : insets.bottom + space.xxl;

  function goBack() {
    if (presentation === "embedded") {
      onClose?.();
      return;
    }
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("Workspace");
  }
  const { session, logout } = useAuth();
  const favorites = useFavorites();
  const refreshSaved = useRef(favorites.refreshSaved);
  refreshSaved.current = favorites.refreshSaved;
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [tracking, setTracking] = useState<TrackingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<Action | null>(null);
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [fleetNote, setFleetNote] = useState<string | null>(null);
  const [sharingGps, setSharingGps] = useState(false);
  const [assignmentSuccess, setAssignmentSuccess] = useState<Shipment | null>(null);
  const role = session.status === "authenticated" ? session.user.role : null;

  const load = useCallback(async () => {
    if (!role || role === "ADMIN") {
      setError("Tài khoản này không có đơn để xem trên app.");
      return;
    }
    try {
      const next = await loadShipment(role, shipmentId);
      setShipment(next);
      setError(null);
      await refreshSaved.current(next);
      if ((role === "SHIPPER" || role === "CARRIER" || role === "DRIVER") && next.status === "IN_TRANSIT") {
        try {
          setTracking(await loadTracking(role, next.id));
        } catch {
          setTracking(null);
        }
      } else {
        setTracking(null);
      }
      const canAssign = role === "CARRIER" && next.status === "MATCHED" && !next.vehicleId && !next.driverId;
      if (canAssign) {
        try {
          const fleet = await loadFleet();
          setVehicles(fleet.vehicles);
          setDrivers(fleet.drivers);
          setFleetNote(null);
        } catch (caught) {
          setFleetNote(caught instanceof ApiError ? caught.message : "Không tải được xe và tài xế.");
        }
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        await logout();
        return;
      }
      setShipment(null);
      setError(caught instanceof ApiError ? caught.message : "Không tải được đơn.");
    }
  }, [logout, role, shipmentId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function run(action: Action) {
    if (!shipment) return;
    setPending(action);
    setActionError(null);
    try {
      const next =
        action === "cancel"
          ? await cancelShipment(shipment.id)
          : action === "claim"
            ? await claimShipment(shipment.id)
            : action === "pickup"
              ? await confirmPickup(shipment.id)
              : action === "delivery"
                ? await confirmDelivery(shipment.id)
                : await assignShipment(shipment.id, vehicleId ?? "", driverId ?? "");
      setShipment(next);
      setConfirm(null);
      if (action === "assign") {
        setVehicleId(null);
        setDriverId(null);
        setAssignmentSuccess(next);
      }
      await favorites.refreshSaved(next);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        await logout();
        return;
      }
      setActionError(caught instanceof ApiError ? caught.message : "Thao tác không thành công.");
      setConfirm(null);
      await load();
    } finally {
      setPending(null);
    }
  }

  if (error && !shipment) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: stackPaddingTop }]}>
        <Back onPress={goBack} />
        <ErrorState message={error} onRetry={() => void load()} />
        {favorites.has(shipmentId) ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Xóa khỏi yêu thích" onPress={() => void favorites.remove(shipmentId)} style={[styles.removeMissing, pointer]}>
            <Text style={[styles.removeMissingText, { color: colors.danger }]}>Đơn không còn xem được. Xóa khỏi yêu thích</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
  if (!shipment) return <LoadingBlock label="Đang tải đơn" />;

  const canCancel = role === "SHIPPER" && shipment.status === "PUBLISHED";
  const canClaim = role === "CARRIER" && shipment.status === "PUBLISHED" && !shipment.carrierId;
  const canAssign = role === "CARRIER" && shipment.status === "MATCHED" && !shipment.vehicleId && !shipment.driverId;
  const canPickup = role === "DRIVER" && shipment.nextAction === "pickup";
  const canDeliver = role === "DRIVER" && shipment.nextAction === "delivery";
  const saved = favorites.has(shipment.id);

  const chrome = (
    <>
      <View style={styles.topBar}>
        <Back onPress={goBack} />
        <Text style={[styles.topTitle, { color: colors.ink }]}>Chi tiết đơn</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
          onPress={() => void favorites.toggle(shipment)}
          style={[styles.heart, pointer]}
        >
          <MaterialCommunityIcons name={saved ? "heart" : "heart-outline"} size={24} color={saved ? colors.danger : colors.ink} />
        </Pressable>
      </View>
      <ScrollView style={styles.fill} contentContainerStyle={[styles.page, { paddingBottom: scrollBottomPad }]}>
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Image
            source={cargoHeroImage(shipment.temperatureGroup, shipment.status)}
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            style={styles.heroPhoto}
          />
          <View style={styles.heroBody}>
            <StatusPill status={shipment.status} label={shipment.statusLabel} />
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={[styles.title, { color: colors.ink }]}>
              {shipment.cargoDescription}
            </Text>
            <Text maxFontSizeMultiplier={1.5} style={[styles.route, { color: colors.ink }]}>
              {shipment.pickupLocation}
              <Text style={{ color: colors.primary }}>{"  →  "}</Text>
              {shipment.deliveryLocation}
            </Text>
            <View style={[styles.priceRow, { borderTopColor: colors.line }]}>
              <View>
                <Text maxFontSizeMultiplier={1.4} style={[styles.priceLabel, { color: colors.muted }]}>
                  Cước niêm yết
                </Text>
                <Text style={[styles.caption, { color: colors.muted }]}>Chưa phải thanh toán trên app.</Text>
              </View>
              <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={[styles.price, { color: colors.primary }]}>
                {formatVnd(shipment.listedPriceVnd)}
              </Text>
            </View>
          </View>
        </View>
        {actionError ? <FieldError message={actionError} /> : null}

        {canAssign ? (
          <CarrierAssignmentSection
            vehicles={vehicles}
            drivers={drivers}
            vehicleId={vehicleId}
            driverId={driverId}
            fleetNote={fleetNote}
            onSelectVehicle={(id) => {
              setVehicleId(id);
              setDriverId(null);
            }}
            onSelectDriver={setDriverId}
            onAssign={() => setConfirm("assign")}
          />
        ) : null}

        <Section title="Lộ trình">
          <Stop label="Lấy hàng" place={shipment.pickupLocation} company={shipment.pickupCompany} contact={shipment.pickupContactName} phone={shipment.pickupPhone} when={formatWindow(shipment.pickupDate, shipment.pickupTimeFrom, shipment.pickupTimeTo)} />
          <Stop label="Giao hàng" place={shipment.deliveryLocation} company={shipment.deliveryCompany} contact={shipment.deliveryContactName} phone={shipment.deliveryPhone} when={formatWindow(shipment.deliveryDate, shipment.deliveryTimeFrom, shipment.deliveryTimeTo)} />
        </Section>

        <Section title="Hàng và xe">
          <Fact label="Nhóm nhiệt" value={shipment.temperatureLabel} />
          <Fact label="Yêu cầu xe" value={shipment.vehicleRequirement || "Chưa ghi"} />
          <Fact label="Khối lượng" value={shipment.cargoWeightTon == null ? "Chưa ghi" : `${shipment.cargoWeightTon} tấn`} />
          <Fact label="Thể tích" value={shipment.cargoVolumeM3 == null ? "Chưa ghi" : `${shipment.cargoVolumeM3} m³`} />
          <Fact label="Số thùng" value={shipment.packageCount == null ? "Chưa ghi" : String(shipment.packageCount)} />
          {shipment.vehicleLabel ? <Fact label="Xe" value={shipment.vehicleLabel} /> : null}
          {shipment.driverName ? <Fact label="Tài xế" value={shipment.driverName} /> : null}
        </Section>

        <ReviewSection
          shipmentId={shipment.id}
          canWrite={role === "SHIPPER" && (shipment.status === "DELIVERY_CONFIRMED" || shipment.status === "COMPLETED") && shipment.carrierId != null}
        />

        {shipment.timeline.length > 0 ? (
          <Section title="Mốc đã ghi">
            {shipment.timeline.map((event) => (
              <View key={event.id} style={styles.event}>
                <Text style={[styles.eventTitle, { color: colors.ink }]}>{event.label}</Text>
                <Text style={[styles.eventMeta, { color: colors.muted }]}>
                  {formatWhen(event.occurredAt)}
                  {event.statusAfterLabel ? ` · ${event.statusAfterLabel}` : ""}
                </Text>
                {event.detail ? <Text style={[styles.eventMeta, { color: colors.muted }]}>{event.detail}</Text> : null}
              </View>
            ))}
          </Section>
        ) : null}

        {shipment.status === "IN_TRANSIT" ? (
          <Section title="Vị trí xe">
            <Text style={[styles.eventMeta, { color: colors.ink }]}>{tracking?.phaseLabel ?? "Chưa xem được vị trí xe."}</Text>
            {tracking?.latitude != null && tracking.longitude != null ? (
              <Text style={[styles.eventMeta, { color: colors.muted }]}>
                {tracking.latitude.toFixed(5)}, {tracking.longitude.toFixed(5)}
              </Text>
            ) : (
              <Text style={[styles.eventMeta, { color: colors.muted }]}>Chưa có tọa độ. Tài xế gửi vị trí khi chuyến đang chạy.</Text>
            )}
            {role === "DRIVER" ? (
              <PrimaryButton
                spaced={false}
                label={sharingGps ? "Đang gửi vị trí…" : "Gửi vị trí GPS"}
                pending={sharingGps}
                pendingLabel="Đang gửi vị trí…"
                onPress={() => {
                  setSharingGps(true);
                  setActionError(null);
                  void readDeviceFix()
                    .then((fix) => reportDriverLocation(shipment.id, fix))
                    .then((next) => setTracking(next))
                    .catch((caught) => setActionError(caught instanceof Error ? caught.message : "Không gửi được vị trí."))
                    .finally(() => setSharingGps(false));
                }}
              />
            ) : null}
          </Section>
        ) : null}

        {canClaim ? <PrimaryButton label="Nhận chuyến" onPress={() => setConfirm("claim")} /> : null}
        {canPickup ? <PrimaryButton label="Xác nhận đã lấy hàng" onPress={() => setConfirm("pickup")} /> : null}
        {canDeliver ? <PrimaryButton label="Xác nhận đã giao hàng" onPress={() => setConfirm("delivery")} /> : null}
        {canCancel ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Hủy đơn" onPress={() => setConfirm("cancel")} style={[styles.cancel, pointer, { borderColor: colors.danger }]}>
            <Text style={[styles.cancelText, { color: colors.danger }]}>Hủy đơn đang tìm xe</Text>
          </Pressable>
        ) : null}
        {role === "SHIPPER" && !canCancel ? <Text style={[styles.eventMeta, { color: colors.muted }]}>Chỉ hủy được đơn đang tìm xe. Đơn đã có nhà xe nhận thì chưa mở hủy.</Text> : null}
      </ScrollView>
      <AssignmentSuccessSheet
        visible={assignmentSuccess !== null}
        shipment={assignmentSuccess}
        onClose={() => setAssignmentSuccess(null)}
        onViewDetail={() => setAssignmentSuccess(null)}
      />
      <ConfirmDialog
        visible={confirm !== null}
        title={confirmCopy[confirm ?? "claim"].title}
        body={confirmCopy[confirm ?? "claim"].body}
        confirmLabel={confirmCopy[confirm ?? "claim"].confirm}
        tone={confirm === "cancel" ? "danger" : "primary"}
        pending={pending !== null}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) void run(confirm);
        }}
        />
    </>
  );

  if (presentation === "embedded") {
    return (
      <View style={[styles.screen, styles.embedded, { backgroundColor: colors.background }]}>
        {chrome}
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: stackPaddingTop }]}>
      <PhoneFrame>{chrome}</PhoneFrame>
    </View>
  );
}

export function ShipmentDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "ShipmentDetail">>();
  return <ShipmentDetailBody shipmentId={route.params.id} presentation="stack" />;
}

export function ShipmentDetailPanel({ shipmentId, onClose }: { shipmentId: string; onClose: () => void }) {
  return <ShipmentDetailBody shipmentId={shipmentId} presentation="embedded" onClose={onClose} />;
}

const confirmCopy: Record<Action, { title: string; body: string; confirm: string }> = {
  cancel: {
    title: "Hủy đơn này?",
    body: "Chỉ hủy được khi đơn còn đang tìm xe. Sau khi hủy, nhà xe không nhận được chuyến này nữa.",
    confirm: "Hủy đơn",
  },
  claim: {
    title: "Nhận chuyến này?",
    body: "Nhận chuyến chưa gán xe hoặc tài xế. Xe và tài xế được chọn sau khi nhận thành công.",
    confirm: "Nhận chuyến",
  },
  assign: {
    title: "Phân công chuyến?",
    body: "Một xe chỉ giữ một chuyến chưa xong. Tài xế sẽ thấy chuyến sau khi phân công thành công.",
    confirm: "Phân công",
  },
  pickup: {
    title: "Xác nhận đã lấy hàng?",
    body: "Chuyến chuyển sang đang vận chuyển. Chỉ xác nhận khi hàng đã lên xe.",
    confirm: "Đã lấy hàng",
  },
  delivery: {
    title: "Xác nhận đã giao hàng?",
    body: "Xác nhận giao ghi mốc hoàn thành chuyến. Đây không phải thanh toán.",
    confirm: "Đã giao hàng",
  },
};

function Back({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onPress} style={[styles.back, pointer]}>
      <MaterialCommunityIcons name="arrow-left" size={24} color={colors.ink} />
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.ink }]}>{title}</Text>
      {children}
    </View>
  );
}

function Stop({ label, place, company, contact, phone, when }: { label: string; place: string; company: string | null; contact: string | null; phone: string | null; when: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stop}>
      <Text style={[styles.stopLabel, { color: colors.primary }]}>{label}</Text>
      <Text style={[styles.stopPlace, { color: colors.ink }]}>{place}</Text>
      {company ? <Text style={[styles.eventMeta, { color: colors.muted }]}>{company}</Text> : null}
      <Text style={[styles.eventMeta, { color: colors.muted }]}>{[contact, phone].filter(Boolean).join(" · ") || "Chưa có người liên hệ"}</Text>
      <Text style={[styles.eventMeta, { color: colors.ink }]}>{when}</Text>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.fact}>
      <Text style={[styles.factLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.factValue, { color: colors.ink }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  embedded: { minHeight: 0 },
  fill: { flex: 1 },
  topBar: { minHeight: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: space.sm },
  back: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 22 },
  heart: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  page: { padding: space.lg, gap: space.md },
  hero: { borderWidth: 1, borderRadius: radius.card, overflow: "hidden" },
  heroPhoto: { width: "100%", height: 200 },
  heroBody: { padding: space.lg, gap: space.sm },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 30 },
  route: { fontFamily: "Inter_500Medium", fontSize: 16, lineHeight: 24 },
  priceRow: {
    marginTop: space.sm,
    paddingTop: space.md,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: space.md,
  },
  priceLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  price: { flexShrink: 1, fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 28, textAlign: "right" },
  caption: { marginTop: 2, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  section: { borderWidth: 1, borderRadius: radius.card, padding: space.lg, gap: space.md },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 26 },
  stop: { gap: 2 },
  stopLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18, letterSpacing: 0.4 },
  stopPlace: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24 },
  event: { gap: 2 },
  eventTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 22 },
  eventMeta: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  fact: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
  factLabel: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20 },
  factValue: { flex: 1, textAlign: "right", fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  cancel: { minHeight: 52, borderWidth: 1, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  cancelText: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24 },
  removeMissing: { minHeight: 48, alignItems: "center", justifyContent: "center", marginBottom: space.xl },
  removeMissingText: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22, textAlign: "center", paddingHorizontal: space.lg },
});

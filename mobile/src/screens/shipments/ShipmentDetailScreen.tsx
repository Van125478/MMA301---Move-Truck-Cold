import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { FieldError } from "../../components/common/FieldError";
import { ShipmentStatusBadge } from "../../components/shipment/ShipmentStatusBadge";
import { ShipmentTimelineView } from "../../components/shipment/ShipmentTimelineView";
import { panelChrome, space, type as textType, useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import { useShipmentDetail } from "../../features/shipments/useShipmentDetail";
import type { RootStackParamList } from "../../navigation/types";
import { apiOrigin } from "../../constants/config";
import { formatCalendarDate, formatVnd } from "../../utils/format";
import type { ApiErrorKind } from "../../utils/apiErrorClassifier";

const errorIconByKind: Record<ApiErrorKind, keyof typeof MaterialCommunityIcons.glyphMap> = {
  network: "wifi-off",
  session: "lock-outline",
  forbidden: "shield-alert-outline",
  notFound: "file-search-outline",
  server: "alert-circle-outline",
};

const errorTitleByKind: Record<ApiErrorKind, string> = {
  network: "Mất kết nối",
  session: "Hết phiên đăng nhập",
  forbidden: "Không có quyền truy cập",
  notFound: "Không tìm thấy đơn",
  server: "Máy chủ gặp lỗi",
};

function InfoRow({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.hint} style={styles.infoIcon} />
      <View style={styles.infoBody}>
        <Text style={[styles.infoLabel, { color: colors.hint }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.ink }]}>{value}</Text>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, panelChrome(colors)]}>
      <Text style={[styles.sectionTitle, { color: colors.ink }]}>{title}</Text>
      {children}
    </View>
  );
}

export function ShipmentDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ShipmentDetail">>();
  const { id } = route.params;
  const { session } = useAuth();
  const { state, reload, cancel, cancelling, cancelError, clearCancelError } = useShipmentDetail(id);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  if (state.status === "loading") {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View accessibilityRole="progressbar" accessibilityLabel="Đang tải chi tiết đơn" style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.body, { color: colors.muted, marginTop: space.md }]}>Đang tải chi tiết đơn…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === "error") {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View accessibilityRole="alert" style={styles.center}>
          <MaterialCommunityIcons name={errorIconByKind[state.kind]} size={40} color={colors.danger} />
          <Text accessibilityRole="header" style={[styles.errorTitle, { color: colors.ink, marginTop: space.md }]}>
            {errorTitleByKind[state.kind]}
          </Text>
          <Text style={[styles.body, { color: colors.muted, textAlign: "center", marginTop: space.sm }]}>{state.message}</Text>
          {state.kind === "session" ? (
            <PrimaryButton label="Đăng nhập lại" onPress={() => navigation.navigate("Login")} />
          ) : (
            <PrimaryButton label="Thử lại" onPress={() => void reload()} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const { shipment } = state;
  const user = session.status === "authenticated" ? session.user : null;
  const canCancel =
    user !== null &&
    user.role === "SHIPPER" &&
    user.accountStatus === "ACTIVE" &&
    shipment.shipperId === user.id &&
    shipment.status === "PUBLISHED";

  async function confirmCancel() {
    if (!canCancel) return;
    const ok = await cancel();
    if (ok) setConfirmingCancel(false);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <ShipmentStatusBadge status={shipment.status} label={shipment.statusLabel} />
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink, marginTop: space.md }]}>
            {shipment.cargoDescription}
          </Text>
          <Text style={[styles.price, { color: colors.primary }]}>{formatVnd(shipment.listedPriceVnd)}</Text>
        </View>

        <Section title="Lấy hàng">
          <InfoRow icon="map-marker-outline" label="Điểm lấy" value={shipment.pickupLocation} />
          <InfoRow icon="calendar-outline" label="Ngày lấy" value={formatCalendarDate(shipment.pickupDate)} />
          {shipment.pickupContactName ? <InfoRow icon="account-outline" label="Người liên hệ" value={shipment.pickupContactName} /> : null}
          {shipment.pickupPhone ? <InfoRow icon="phone-outline" label="Số điện thoại" value={shipment.pickupPhone} /> : null}
        </Section>

        <Section title="Giao hàng">
          <InfoRow icon="map-marker-check-outline" label="Điểm giao" value={shipment.deliveryLocation} />
          <InfoRow icon="calendar-outline" label="Ngày giao" value={formatCalendarDate(shipment.deliveryDate)} />
          {shipment.deliveryContactName ? <InfoRow icon="account-outline" label="Người liên hệ" value={shipment.deliveryContactName} /> : null}
          {shipment.deliveryPhone ? <InfoRow icon="phone-outline" label="Số điện thoại" value={shipment.deliveryPhone} /> : null}
        </Section>

        <Section title="Hàng hóa">
          <InfoRow icon="thermometer" label="Nhóm nhiệt" value={shipment.temperatureLabel} />
          <InfoRow icon="truck-outline" label="Yêu cầu xe" value={shipment.vehicleRequirement || "Không yêu cầu"} />
          {shipment.cargoWeightTon !== null ? (
            <InfoRow icon="weight-kilogram" label="Khối lượng" value={`${shipment.cargoWeightTon} tấn`} />
          ) : null}
          {shipment.cargoVolumeM3 !== null ? <InfoRow icon="cube-outline" label="Thể tích" value={`${shipment.cargoVolumeM3} m³`} /> : null}
          {shipment.packageCount !== null ? <InfoRow icon="format-list-numbered" label="Số kiện" value={`${shipment.packageCount}`} /> : null}
          {shipment.cargoImages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
              {shipment.cargoImages.map((image) => (
                <Image
                  key={image.id}
                  source={{ uri: `${apiOrigin}/api/cargo-images/${image.id}` }}
                  style={[styles.image, { borderColor: colors.line }]}
                  accessibilityLabel="Ảnh hàng hóa"
                />
              ))}
            </ScrollView>
          ) : null}
        </Section>

        {shipment.vehicleLabel || shipment.driverName ? (
          <Section title="Nhà xe & tài xế">
            {shipment.vehicleLabel ? <InfoRow icon="truck" label="Xe" value={shipment.vehicleLabel} /> : null}
            {shipment.driverName ? <InfoRow icon="account-tie-outline" label="Tài xế" value={shipment.driverName} /> : null}
          </Section>
        ) : null}

        <Section title="Lịch sử">
          <ShipmentTimelineView timeline={shipment.timeline} />
        </Section>

        {canCancel ? (
          <View style={styles.cancelZone}>
            {cancelError ? (
              <View accessibilityRole="alert" style={styles.cancelErrorBox}>
                <FieldError message={cancelError} />
              </View>
            ) : null}
            {confirmingCancel ? (
              <View style={[styles.card, panelChrome(colors)]}>
                <Text style={[styles.body, { color: colors.ink }]}>Hủy đơn này? Không thể hoàn tác.</Text>
                <View style={styles.confirmRow}>
                  <PrimaryButton
                    label="Không hủy"
                    onPress={() => {
                      setConfirmingCancel(false);
                      clearCancelError();
                    }}
                    disabled={cancelling}
                  />
                  <PrimaryButton label="Xác nhận hủy" pendingLabel="Đang hủy…" onPress={() => void confirmCancel()} pending={cancelling} />
                </View>
              </View>
            ) : (
              <PrimaryButton label="Hủy đơn" onPress={() => setConfirmingCancel(true)} />
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.xxl },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl },
  header: { marginBottom: space.lg },
  title: { ...textType.title },
  errorTitle: { ...textType.title },
  price: { fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 28, marginTop: space.sm },
  body: { ...textType.body },
  card: { padding: space.lg, marginBottom: space.lg },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 20, marginBottom: space.md },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm, marginBottom: space.md },
  infoIcon: { marginTop: 2 },
  infoBody: { flex: 1 },
  infoLabel: { fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 16 },
  infoValue: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22, marginTop: 2 },
  imageRow: { marginTop: space.sm },
  image: { width: 96, height: 96, borderRadius: 12, borderWidth: 1, marginRight: space.sm },
  cancelZone: { marginTop: space.sm },
  cancelErrorBox: { marginBottom: space.md },
  confirmRow: { flexDirection: "row", gap: space.md },
});

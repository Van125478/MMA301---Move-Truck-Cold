import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { elevatedCard, panelChrome, space, useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import { ConfirmDialog } from "../../components/common/Feedback";
import { choosePlan, loadCatalog, loadPlan, releasePlan, type CatalogPlan, type PlanSummary } from "../../services/api/operations";
import { ApiError } from "../../services/api/client";
import { FleetScreen } from "../fleet/FleetScreen";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { FieldError } from "../../components/common/FieldError";
import { formatVnd } from "../../utils/format";
import { DomesticDieselCard } from "../../components/market/DomesticDieselCard";
import type { UserRole } from "../../types/auth";

const roleLabel: Record<UserRole, string> = {
  SHIPPER: "Chủ hàng",
  CARRIER: "Nhà xe",
  DRIVER: "Tài xế",
  ADMIN: "Quản trị",
};

const roleIcon: Record<UserRole, keyof typeof MaterialCommunityIcons.glyphMap> = {
  SHIPPER: "package-variant-closed",
  CARRIER: "truck-outline",
  DRIVER: "steering",
  ADMIN: "shield-account-outline",
};

export function AccountScreen() {
  const { colors } = useTheme();
  const { session, logout } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const [plan, setPlan] = useState<PlanSummary | null>(null);
  const [catalog, setCatalog] = useState<CatalogPlan[]>([]);
  const [planError, setPlanError] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [viewed, setViewed] = useState<CatalogPlan | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<CatalogPlan | null>(null);
  const [releaseAsk, setReleaseAsk] = useState(false);
  const load = useCallback(async () => {
    if (session.status !== "authenticated" || session.user.role === "DRIVER" || session.user.role === "ADMIN") return;
    try {
      const [current, plans] = await Promise.all([loadPlan(), loadCatalog(session.user.role)]);
      setPlan(current);
      setCatalog(plans);
    } catch {
      setPlan(null);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (session.status !== "authenticated") return null;
  const user = session.user;
  const name = user.email || user.username || "Tài khoản";

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={[styles.kicker, { color: colors.primary }]}>TÀI KHOẢN</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
        {roleLabel[user.role]}
      </Text>
      <View style={[styles.card, panelChrome(colors)]}>
        <View style={[styles.avatar, { backgroundColor: colors.badge }]}>
          <MaterialCommunityIcons name={roleIcon[user.role]} size={28} color={colors.badgeInk} />
        </View>
        <Text style={[styles.name, { color: colors.ink }]}>{name}</Text>
        <View style={[styles.badge, { backgroundColor: colors.badge }]}>
          <Text style={[styles.badgeText, { color: colors.badgeInk }]}>{roleLabel[user.role]}</Text>
        </View>
        {plan ? (
          <View style={styles.plan}>
            <Text style={[styles.name, { color: colors.ink }]}>{plan.name}</Text>
            <Text style={[styles.body, { color: colors.muted }]}>{formatVnd(plan.priceVnd)} · {plan.note}</Text>
            {plan.vehicleCap != null ? (
              <Text style={[styles.body, { color: plan.overLimit ? colors.danger : colors.muted }]}>
                {plan.activeVehicleCount}/{plan.vehicleCap} xe đang dùng{plan.overLimit ? ". Vượt trần, chưa nhận thêm chuyến mới." : "."}
              </Text>
            ) : null}
            {!plan.code.endsWith("-free") && plan.priceVnd > 0 ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Hủy gói demo" onPress={() => setReleaseAsk(true)} style={[styles.release, { borderColor: colors.danger }]}>
                <Text style={[styles.releaseText, { color: colors.danger }]}>Hủy gói demo</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <Text style={[styles.body, { color: colors.muted }]}>
          {user.role === "ADMIN"
            ? "Khu vận hành quản trị chưa mở trên app."
            : "Phiên đăng nhập được giữ trên máy. Đăng xuất xóa phiên, không xóa danh sách yêu thích của tài khoản này."}
        </Text>
      </View>
      {user.role === "SHIPPER" || user.role === "CARRIER" ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Mua gói</Text>
          <Text style={[styles.sectionNote, { color: colors.muted }]}>Chọn gói để dùng hạn mức. App chưa thu tiền thật.</Text>
          {planError ? <FieldError message={planError} /> : null}
          {catalog.map((item) => {
            const current = plan?.code === item.code;
            return (
              <Pressable
                key={item.code}
                accessibilityRole="button"
                accessibilityLabel={`Xem chi tiết gói ${item.name}`}
                onPress={() => setViewed(item)}
                style={[styles.planCard, elevatedCard(colors), current ? { borderColor: colors.primary, borderWidth: 1.5 } : null]}
              >
                <View style={styles.planTop}>
                  <Text style={[styles.planName, { color: colors.ink }]}>{item.name}</Text>
                  <Text style={[styles.planPrice, { color: colors.primary }]}>{item.listPriceLabel || "0 VND"}</Text>
                </View>
                <Text style={[styles.sectionNote, { color: colors.muted }]}>
                  {cycleLabel(item.billingCycle)}
                  {current ? " · Đang dùng" : ""}
                </Text>
                <Text style={[styles.link, { color: colors.primary }]}>Xem chi tiết</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {user.role === "CARRIER" ? <FleetScreen /> : null}
      {user.role === "CARRIER" || user.role === "DRIVER" ? <DomesticDieselCard /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đăng xuất"
        accessibilityState={{ busy: leaving, disabled: leaving }}
        disabled={leaving}
        onPress={() => {
          setLeaving(true);
          void logout().finally(() => setLeaving(false));
        }}
        style={[styles.logout, { borderColor: colors.line, backgroundColor: colors.surface, opacity: leaving ? 0.6 : 1 }]}
      >
        <Text style={[styles.logoutText, { color: colors.ink }]}>{leaving ? "Đang đăng xuất…" : "Đăng xuất"}</Text>
      </Pressable>
      <Modal visible={viewed !== null} transparent animationType="fade" onRequestClose={() => setViewed(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            {viewed ? (
              <>
                <Text accessibilityRole="header" style={[styles.sheetTitle, { color: colors.ink }]}>{viewed.name}</Text>
                <Fact label="Giá niêm yết" value={viewed.listPriceLabel || "0 VND"} />
                <Fact label="Kỳ hạn" value={cycleLabel(viewed.billingCycle)} />
                <Fact label="Trần xe đang dùng" value={viewed.vehicleCap == null ? "Không giới hạn" : `${viewed.vehicleCap} xe`} />
                <Fact label="Phí nền tảng trên cước" value={viewed.rateLabel || "Theo gói"} />
                <Text style={[styles.sectionNote, { color: colors.muted }]}>Xem chi tiết không đăng ký gói. Bấm Đóng để thoát.</Text>
                <View style={styles.sheetRow}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={() => setViewed(null)} style={[styles.sheetButton, { borderColor: colors.line }]}>
                    <Text style={[styles.releaseText, { color: colors.ink }]}>Đóng</Text>
                  </Pressable>
                  {plan?.code === viewed.code ? null : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Đăng ký gói"
                      onPress={() => {
                        setConfirmPlan(viewed);
                        setViewed(null);
                      }}
                      style={[styles.sheetButton, { borderColor: colors.primary, backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.releaseText, { color: colors.onPrimary }]}>Đăng ký gói</Text>
                    </Pressable>
                  )}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
      <ConfirmDialog
        visible={confirmPlan !== null}
        title={confirmPlan ? `Đăng ký ${confirmPlan.name}?` : "Đăng ký gói?"}
        body="Bấm Đóng nếu chưa muốn đăng ký. Gói chỉ kích hoạt sau khi xác nhận."
        confirmLabel={buying ? "Đang đăng ký…" : "Xác nhận"}
        pending={buying !== null}
        onCancel={() => {
          if (!buying) setConfirmPlan(null);
        }}
        onConfirm={() => {
          if (!confirmPlan) return;
          setBuying(confirmPlan.code);
          setPlanError(null);
          void choosePlan(confirmPlan.code)
            .then(() => {
              setConfirmPlan(null);
              return load();
            })
            .catch((caught) => setPlanError(caught instanceof ApiError ? caught.message : "Môi trường này chưa mở mua gói."))
            .finally(() => setBuying(null));
        }}
      />
      <ConfirmDialog
        visible={releaseAsk}
        title="Hủy gói demo?"
        body="Gói đang dùng sẽ dừng ngay và tài khoản về Free, để bạn đăng ký gói khác khi demo."
        confirmLabel="Hủy gói"
        tone="danger"
        onCancel={() => setReleaseAsk(false)}
        onConfirm={() => {
          setReleaseAsk(false);
          void releasePlan()
            .then(() => load())
            .catch((caught) => setPlanError(caught instanceof ApiError ? caught.message : "Không nhả được gói."));
        }}
      />
    </ScrollView>
  );
}

function cycleLabel(cycle: string): string {
  if (cycle === "MONTH") return "Theo tháng";
  if (cycle === "YEAR") return "Theo năm";
  return "Không kỳ hạn";
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
  page: { padding: space.lg, paddingBottom: 96, flexGrow: 1 },
  kicker: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18, letterSpacing: 1.1 },
  title: { marginTop: space.sm, fontFamily: "Inter_700Bold", fontSize: 28, lineHeight: 36 },
  card: { marginTop: space.lg, padding: space.xl, alignItems: "center", gap: space.sm },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  name: { marginTop: space.sm, fontFamily: "Inter_600SemiBold", fontSize: 18, lineHeight: 26, textAlign: "center" },
  plan: { alignItems: "center", gap: 2, marginTop: space.sm },
  badge: { marginTop: space.xs, borderRadius: 999, paddingHorizontal: space.md, paddingVertical: space.xs },
  badgeText: { fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 },
  body: { marginTop: space.md, fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 24, textAlign: "center" },
  section: { marginTop: space.xl, gap: space.md },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 20, lineHeight: 28 },
  sectionNote: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  planCard: { padding: space.lg, gap: space.sm },
  planTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  planName: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 22 },
  planPrice: { fontFamily: "Inter_700Bold", fontSize: 14, lineHeight: 20 },
  link: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  release: { minHeight: 44, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  releaseText: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  backdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.48)", justifyContent: "flex-end", padding: space.lg },
  sheet: { borderRadius: 20, padding: space.xl, gap: space.md },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 30 },
  sheetRow: { flexDirection: "row", gap: space.sm },
  sheetButton: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  fact: { gap: 2 },
  factLabel: { fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 },
  factValue: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 22 },
  logout: { minHeight: 52, marginTop: space.xxl, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  logoutText: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24 },
});

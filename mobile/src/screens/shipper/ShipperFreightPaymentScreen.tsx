import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { EmptyState, ErrorState, LoadingBlock, SearchField } from "../../components/common/Feedback";
import { ShipmentCard } from "../../components/shipment/ShipmentCard";
import { pointer } from "../../constants/hit";
import { space, useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import { useFavorites } from "../../features/favorites/FavoritesProvider";
import {
  freightPaymentMethodLabel,
  paymentByShipment,
  readFreightPayments,
  recordFreightPayment,
  type FreightPaymentMethod,
  type FreightPaymentRecord,
} from "../../features/freightPayments/store";
import { listShipments } from "../../services/api/shipments";
import type { Shipment } from "../../types/shipment";
import { foldSearch } from "../../utils/catalog";
import { formatVnd, formatWhen } from "../../utils/format";

const deliveredStatuses = new Set<Shipment["status"]>(["DELIVERY_CONFIRMED", "COMPLETED"]);

function shipmentTag(id: string): string {
  const tail = id.replace(/[^a-fA-F0-9]/g, "").slice(-6).toUpperCase();
  return tail ? `#${tail}` : id.slice(0, 8);
}

function HubScroll({ hub, children }: { hub: ReactNode; children: ReactNode }) {
  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.hubPad}>{hub}</View>
      <View style={styles.bodyPad}>{children}</View>
    </ScrollView>
  );
}

export function ShipperFreightPaymentScreen({
  hub,
  onOpenDetail,
  onPaymentsChange,
}: {
  hub: ReactNode;
  onOpenDetail: (shipmentId: string) => void;
  onPaymentsChange?: () => void;
}) {
  const { colors } = useTheme();
  const { session } = useAuth();
  const favorites = useFavorites();
  const userId = session.status === "authenticated" ? session.user.id : null;
  const [orders, setOrders] = useState<Shipment[] | null>(null);
  const [payments, setPayments] = useState<FreightPaymentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setError("Cần đăng nhập để thanh toán cước.");
      setOrders([]);
      return;
    }
    try {
      const [rows, paid] = await Promise.all([listShipments("mine"), readFreightPayments(userId)]);
      setOrders(rows.filter((row) => deliveredStatuses.has(row.status)));
      setPayments(paid);
      setError(null);
    } catch {
      setError("Không tải được danh sách đơn.");
      setOrders(null);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const paidMap = useMemo(() => paymentByShipment(payments), [payments]);

  const { pending, done } = useMemo(() => {
    const source = orders ?? [];
    const q = foldSearch(query.trim());
    const pendingRows: Shipment[] = [];
    const doneRows: { shipment: Shipment; payment: FreightPaymentRecord }[] = [];
    for (const shipment of source) {
      const payment = paidMap.get(shipment.id);
      const hay = foldSearch([shipment.cargoDescription, shipment.pickupLocation, shipment.deliveryLocation, shipmentTag(shipment.id)].join(" "));
      if (q && !hay.includes(q)) continue;
      if (payment) doneRows.push({ shipment, payment });
      else pendingRows.push(shipment);
    }
    return { pending: pendingRows, done: doneRows };
  }, [orders, paidMap, query]);

  const pay = useCallback(
    async (shipment: Shipment, method: FreightPaymentMethod) => {
      if (!userId || busyId) return;
      setBusyId(shipment.id);
      try {
        const next = await recordFreightPayment(userId, {
          shipmentId: shipment.id,
          method,
          paidAt: new Date().toISOString(),
          amountVnd: shipment.listedPriceVnd,
        });
        setPayments(next);
        onPaymentsChange?.();
      } finally {
        setBusyId(null);
      }
    },
    [busyId, onPaymentsChange, userId],
  );

  if (orders === null && error) {
    return (
      <HubScroll hub={hub}>
        <ErrorState message={error} onRetry={() => void load()} />
      </HubScroll>
    );
  }
  if (orders === null) {
    return (
      <HubScroll hub={hub}>
        <LoadingBlock label="Đang tải đơn cần thanh toán" />
      </HubScroll>
    );
  }

  return (
    <HubScroll hub={hub}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
        Thanh toán đơn
      </Text>
      <Text style={[styles.lede, { color: colors.muted }]}>
        Chỉ hiện đơn đã xác nhận giao hàng. Ghi nhận thanh toán cước bằng tiền mặt hoặc chuyển khoản trên máy này.
      </Text>
      <SearchField hideLabel label="Tìm đơn" value={query} onChangeText={setQuery} />
      <Text style={[styles.section, { color: colors.ink }]}>Chưa thanh toán ({pending.length})</Text>
      {pending.length === 0 ? (
        <EmptyState title="Không còn đơn chờ thanh toán" body="Các đơn đã giao và chưa ghi nhận sẽ hiện ở đây." />
      ) : (
        pending.map((shipment) => (
          <View key={shipment.id} style={styles.cardWrap}>
            <ShipmentCard
              shipment={shipment}
              saved={favorites.has(shipment.id)}
              onOpen={() => onOpenDetail(shipment.id)}
              onToggleFavorite={() => void favorites.toggle(shipment)}
              appendBody={
                <View style={styles.actions}>
                  <PayButton label="Tiền mặt" disabled={busyId !== null} onPress={() => void pay(shipment, "CASH")} colors={colors} />
                  <PayButton label="Chuyển khoản" disabled={busyId !== null} onPress={() => void pay(shipment, "TRANSFER")} colors={colors} />
                </View>
              }
            />
          </View>
        ))
      )}
      {done.length > 0 ? (
        <>
          <Text style={[styles.section, styles.sectionTop, { color: colors.ink }]}>Đã ghi nhận ({done.length})</Text>
          {done.map(({ shipment, payment }) => (
            <View key={shipment.id} style={styles.cardWrap}>
              <ShipmentCard
                shipment={shipment}
                saved={favorites.has(shipment.id)}
                onOpen={() => onOpenDetail(shipment.id)}
                onToggleFavorite={() => void favorites.toggle(shipment)}
                appendBody={
                  <View style={styles.paidRow}>
                    <Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={[styles.paidLabel, { color: colors.hint }]}>
                      THANH TOÁN
                    </Text>
                    <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={[styles.paidValue, { color: colors.ink }]}>
                      {freightPaymentMethodLabel[payment.method]} · {formatVnd(payment.amountVnd)}
                    </Text>
                    <Text maxFontSizeMultiplier={1.25} numberOfLines={1} style={[styles.paidWhen, { color: colors.muted }]}>
                      {formatWhen(payment.paidAt)}
                    </Text>
                  </View>
                }
              />
            </View>
          ))}
        </>
      ) : null}
    </HubScroll>
  );
}

function PayButton({
  label,
  onPress,
  disabled,
  colors,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.payBtn, pointer, { borderColor: colors.line, backgroundColor: colors.surface, opacity: disabled ? 0.6 : 1 }]}
    >
      <Text style={[styles.payBtnText, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingBottom: 96, flexGrow: 1 },
  hubPad: { paddingHorizontal: space.lg, paddingTop: space.sm },
  bodyPad: { paddingHorizontal: space.lg, gap: space.md },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, lineHeight: 28 },
  lede: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  section: { fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 22 },
  sectionTop: { marginTop: space.sm },
  cardWrap: { marginBottom: space.lg },
  actions: { flexDirection: "row", gap: space.sm },
  payBtn: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.sm,
  },
  payBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20, textAlign: "center" },
  paidRow: { gap: 4 },
  paidLabel: { fontFamily: "Inter_600SemiBold", fontSize: 10, lineHeight: 13, letterSpacing: 0.5 },
  paidValue: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  paidWhen: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
});

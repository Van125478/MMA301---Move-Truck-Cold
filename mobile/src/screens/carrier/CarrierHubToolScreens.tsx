import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { EmptyState, ErrorState, LoadingBlock, SearchField } from "../../components/common/Feedback";
import { pointer } from "../../constants/hit";
import { panelChrome, radius, space, useTheme } from "../../constants/theme";
import { ApiError } from "../../services/api/client";
import {
  listIncidentsForCarrier,
  loadCommissionMine,
  type CommissionLedgerEntry,
  type IncidentRow,
} from "../../services/api/operations";
import { foldSearch } from "../../utils/catalog";
import { formatVnd, formatWhen } from "../../utils/format";

const commissionStatusLabel: Record<string, string> = {
  ABSENT: "Chưa có",
  ESTIMATED: "Ước tính",
  ACCRUED: "Đã ghi nhận",
  VOID: "Đã hủy",
  ON_HOLD: "Tạm giữ",
};

function shipmentTag(id: string): string {
  const tail = id.replace(/[^a-fA-F0-9]/g, "").slice(-6).toUpperCase();
  return tail ? `#${tail}` : id.slice(0, 8);
}

function HubScroll({
  hub,
  children,
}: {
  hub: ReactNode;
  children: ReactNode;
}) {
  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.hubPad}>{hub}</View>
      <View style={styles.bodyPad}>{children}</View>
    </ScrollView>
  );
}

export function CarrierTransactionHistoryScreen({
  hub,
  onOpenDetail,
}: {
  hub: ReactNode;
  onOpenDetail: (shipmentId: string) => void;
}) {
  const { colors } = useTheme();
  const [banner, setBanner] = useState("");
  const [items, setItems] = useState<CommissionLedgerEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await loadCommissionMine();
      setBanner(result.banner);
      setItems(result.entries);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không tải được lịch sử giao dịch.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const visible = useMemo(() => {
    const q = foldSearch(query.trim());
    if (!q) return items ?? [];
    return (items ?? []).filter((row) => {
      const hay = foldSearch([row.shipmentId, row.status, commissionStatusLabel[row.status] ?? ""].join(" "));
      return hay.includes(q);
    });
  }, [items, query]);

  if (items === null && error) {
    return (
      <HubScroll hub={hub}>
        <ErrorState message={error} onRetry={() => void load()} />
      </HubScroll>
    );
  }
  if (items === null) {
    return (
      <HubScroll hub={hub}>
        <LoadingBlock label="Đang tải lịch sử giao dịch" />
      </HubScroll>
    );
  }

  return (
    <HubScroll hub={hub}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
        Lịch sử giao dịch
      </Text>
      <Text style={[styles.lede, { color: colors.muted }]}>
        Phí nền tảng và quyết toán mô phỏng theo chuyến nhà xe đã nhận.
      </Text>
      {banner ? <Text style={[styles.banner, { color: colors.warning }]}>{banner}</Text> : null}
      <SearchField hideLabel label="Tìm mã chuyến hoặc trạng thái" value={query} onChangeText={setQuery} />
      {visible.length === 0 ? (
        <EmptyState
          title={query.trim() ? "Không có giao dịch khớp" : "Chưa có giao dịch"}
          body={query.trim() ? "Thử từ khóa khác." : "Khi chuyến có hoa hồng mô phỏng, mục hiện ở đây."}
        />
      ) : (
        visible.map((row, index) => (
          <Pressable
            key={row.shipmentId}
            accessibilityRole="button"
            accessibilityLabel={`Chuyến ${shipmentTag(row.shipmentId)}`}
            onPress={() => onOpenDetail(row.shipmentId)}
            style={[
              styles.row,
              pointer,
              panelChrome(colors),
              index > 0 ? styles.rowGap : null,
            ]}
          >
            <View style={styles.rowTop}>
              <Text style={[styles.rowId, { color: colors.muted }]}>{shipmentTag(row.shipmentId)}</Text>
              <View style={[styles.pill, { backgroundColor: colors.badge }]}>
                <Text style={[styles.pillText, { color: colors.primary }]}>
                  {commissionStatusLabel[row.status] ?? row.status}
                </Text>
              </View>
            </View>
            {row.settlementVnd != null ? (
              <Text style={[styles.amount, { color: colors.ink }]}>{formatVnd(row.settlementVnd)}</Text>
            ) : row.feeVnd != null ? (
              <Text style={[styles.amount, { color: colors.ink }]}>Phí {formatVnd(row.feeVnd)}</Text>
            ) : (
              <Text style={[styles.meta, { color: colors.muted }]}>Chưa có số tiền ghi nhận</Text>
            )}
            {row.baseFreightVnd != null ? (
              <Text style={[styles.meta, { color: colors.muted }]}>Cước gốc {formatVnd(row.baseFreightVnd)}</Text>
            ) : null}
            {row.recordedAt ? (
              <Text style={[styles.meta, { color: colors.hint }]}>Ghi nhận {formatWhen(row.recordedAt)}</Text>
            ) : row.lockedAt ? (
              <Text style={[styles.meta, { color: colors.hint }]}>Khóa {formatWhen(row.lockedAt)}</Text>
            ) : null}
          </Pressable>
        ))
      )}
    </HubScroll>
  );
}

export function CarrierIncidentLookupScreen({
  hub,
  onOpenDetail,
  emptyListBody = "Sự cố trên chuyến nhà xe sẽ hiện ở đây.",
}: {
  hub: ReactNode;
  onOpenDetail: (shipmentId: string) => void;
  emptyListBody?: string;
}) {
  const { colors } = useTheme();
  const [items, setItems] = useState<IncidentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      setItems(await listIncidentsForCarrier());
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không tải được danh sách sự cố.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const visible = useMemo(() => {
    const q = foldSearch(query.trim());
    if (!q) return items ?? [];
    return (items ?? []).filter((row) => {
      const hay = foldSearch([row.id, row.title, row.description, row.shipmentLabel, row.incidentTypeLabel, row.statusLabel].join(" "));
      return hay.includes(q);
    });
  }, [items, query]);

  if (items === null && error) {
    return (
      <HubScroll hub={hub}>
        <ErrorState message={error} onRetry={() => void load()} />
      </HubScroll>
    );
  }
  if (items === null) {
    return (
      <HubScroll hub={hub}>
        <LoadingBlock label="Đang tải sự cố" />
      </HubScroll>
    );
  }

  return (
    <HubScroll hub={hub}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
        Tra cứu sự cố
      </Text>
      <Text style={[styles.lede, { color: colors.muted }]}>
        Tìm theo mã sự cố, chuyến, loại sự cố hoặc trạng thái xử lý.
      </Text>
      <SearchField hideLabel label="Tra cứu sự cố" value={query} onChangeText={setQuery} />
      {visible.length === 0 ? (
        <EmptyState
          title={query.trim() ? "Không có sự cố khớp" : "Chưa có sự cố"}
          body={query.trim() ? "Thử từ khóa khác." : emptyListBody}
        />
      ) : (
        visible.map((row, index) => (
          <Pressable
            key={row.id}
            accessibilityRole="button"
            accessibilityLabel={row.title}
            onPress={() => {
              if (row.shipmentId) onOpenDetail(row.shipmentId);
            }}
            style={[styles.row, pointer, panelChrome(colors), index > 0 ? styles.rowGap : null]}
          >
            <View style={styles.rowTop}>
              <Text numberOfLines={2} style={[styles.rowTitle, { color: colors.ink }]}>
                {row.title}
              </Text>
              <View style={[styles.pill, { backgroundColor: colors.field }]}>
                <Text style={[styles.pillText, { color: colors.ink }]}>{row.statusLabel || row.status}</Text>
              </View>
            </View>
            <Text style={[styles.meta, { color: colors.muted }]}>
              {row.incidentTypeLabel}
              {row.shipmentLabel ? ` · ${row.shipmentLabel}` : row.shipmentId ? ` · ${shipmentTag(row.shipmentId)}` : ""}
            </Text>
            {row.description ? (
              <Text numberOfLines={2} style={[styles.meta, { color: colors.hint }]}>
                {row.description}
              </Text>
            ) : null}
          </Pressable>
        ))
      )}
    </HubScroll>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingBottom: 96, flexGrow: 1 },
  hubPad: { paddingHorizontal: space.lg, paddingTop: space.sm },
  bodyPad: { paddingHorizontal: space.lg, gap: space.md },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, lineHeight: 28 },
  lede: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  banner: { fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 },
  row: { padding: space.lg, gap: space.sm },
  rowGap: { marginTop: space.sm },
  rowTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.sm },
  rowId: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  rowTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 22 },
  amount: { fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 24 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0 },
  pillText: { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 16 },
});

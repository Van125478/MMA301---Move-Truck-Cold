import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChoiceChip, EmptyState, ErrorState, LoadingBlock, SearchField } from "../../components/common/Feedback";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { MarketingSectionHead } from "../../components/layout/MarketingSectionHead";
import { ShipmentCard } from "../../components/shipment/ShipmentCard";
import { space, type, useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import { useFavorites } from "../../features/favorites/FavoritesProvider";
import type { RootStackParamList } from "../../navigation/types";
import { ApiError } from "../../services/api/client";
import { listMarketplaceShipments, listMyShipments, listShipments, type ListMode } from "../../services/api/shipments";
import type { Shipment, ShipmentStatus } from "../../types/shipment";
import { prepareCatalog, temperatureFilters, type TemperatureFilter } from "../../utils/catalog";

const PAGE_SIZE = 20;

const filters: { id: string; label: string; statuses: readonly ShipmentStatus[] | null }[] = [
  { id: "all", label: "Tất cả", statuses: null },
  { id: "open", label: "Đang tìm xe", statuses: ["PUBLISHED"] },
  { id: "running", label: "Đang chạy", statuses: ["MATCHED", "PICKUP_CONFIRMED", "IN_TRANSIT"] },
  { id: "done", label: "Đã giao", statuses: ["DELIVERY_CONFIRMED", "COMPLETED"] },
  { id: "incident", label: "Có sự cố", statuses: ["INCIDENT"] },
  { id: "cancelled", label: "Đã hủy", statuses: ["CANCELLED"] },
];

export function OrderListScreen({
  mode,
  title,
  lede,
  emptyTitle,
  emptyBody,
  onOpenDetail,
  kicker,
  searchLabel = "Tìm trong danh sách",
  sectionTitle,
  primaryAction,
  includeMarketplace = false,
  refreshKey = 0,
}: {
  mode: ListMode;
  title: string;
  lede: string;
  emptyTitle: string;
  emptyBody: string;
  onOpenDetail?: (id: string) => void;
  /** Cùng layout typography với Landing (Chủ hàng). */
  kicker?: string;
  searchLabel?: string;
  sectionTitle?: string;
  primaryAction?: { label: string; onPress: () => void };
  /** Block sàn (cùng API Landing) phía trên danh sách của chủ hàng. */
  includeMarketplace?: boolean;
  /** Đổi giá trị này để tải lại danh sách (sau khi tạo, hủy hoặc đóng chi tiết). */
  refreshKey?: number;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { logout } = useAuth();
  const favorites = useFavorites();
  const [items, setItems] = useState<Shipment[] | null>(null);
  const [marketplace, setMarketplace] = useState<Shipment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [group, setGroup] = useState<TemperatureFilter>("ALL");
  const page = useRef(1);
  const requestId = useRef(0);
  const serverSide = mode === "mine";

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const statusesOf = filters.find((item) => item.id === filter)?.statuses ?? undefined;

  const load = useCallback(
    async (pull: boolean) => {
      const current = ++requestId.current;
      if (pull) setRefreshing(true);
      try {
        const rows = serverSide
          ? await listMyShipments({ statuses: statusesOf, temperatureGroup: group, q: debouncedQuery, page: 1, limit: PAGE_SIZE })
          : await listShipments(mode);
        if (current !== requestId.current) return;
        page.current = 1;
        if (Array.isArray(rows)) {
          setItems(rows);
          setHasMore(false);
          setTotal(null);
        } else {
          setItems(rows.shipments);
          setHasMore(rows.hasMore);
          setTotal(rows.total);
        }
        setMoreError(null);
        setError(null);
      } catch (caught) {
        if (current !== requestId.current) return;
        if (caught instanceof ApiError && caught.status === 401) {
          await logout();
          return;
        }
        setError(caught instanceof ApiError ? caught.message : "Không tải được danh sách.");
      } finally {
        if (current === requestId.current) setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedQuery, filter, group, logout, mode, serverSide, refreshKey],
  );

  const loadMore = useCallback(async () => {
    if (!serverSide || !hasMore || loadingMore || items === null) return;
    const current = requestId.current;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const next = await listMyShipments({ statuses: statusesOf, temperatureGroup: group, q: debouncedQuery, page: page.current + 1, limit: PAGE_SIZE });
      if (current !== requestId.current) return;
      page.current += 1;
      setItems((previous) => {
        const seen = new Set((previous ?? []).map((row) => row.id));
        return [...(previous ?? []), ...next.shipments.filter((row) => !seen.has(row.id))];
      });
      setHasMore(next.hasMore);
      setTotal(next.total);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        await logout();
        return;
      }
      setMoreError(caught instanceof ApiError ? caught.message : "Không tải thêm được đơn.");
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filter, group, hasMore, items, loadingMore, logout, serverSide]);

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  useEffect(() => {
    if (!includeMarketplace) return;
    let alive = true;
    listMarketplaceShipments()
      .then((board) => {
        if (!alive) return;
        setMarketplace(board);
        setMarketError(null);
      })
      .catch(async (caught: unknown) => {
        if (!alive) return;
        if (caught instanceof ApiError && caught.status === 401) {
          await logout();
          return;
        }
        setMarketError(caught instanceof ApiError ? caught.message : "Không tải được sàn đơn đang tìm xe.");
      });
    return () => {
      alive = false;
    };
  }, [includeMarketplace, logout, refreshKey]);

  const visibleBoard = useMemo(() => prepareCatalog(marketplace, query, group), [group, marketplace, query]);
  const ownOrderIds = useMemo(() => new Set((items ?? []).map((row) => row.id)), [items]);

  const visible = useMemo(() => {
    const source = items ?? [];
    return serverSide ? source : prepareCatalog(source, query, group);
  }, [group, items, query, serverSide]);

  if (items === null && error) return <ErrorState message={error} onRetry={() => void load(false)} />;
  if (items === null) return <LoadingBlock label="Đang tải danh sách" />;

  const marketing = Boolean(kicker);

  return (
    <FlatList
      data={visible}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.4}
      contentContainerStyle={styles.list}
      style={styles.fill}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      removeClippedSubviews={Platform.OS === "android"}
      ListHeaderComponent={
        <View style={styles.header}>
          {kicker ? (
            <Text maxFontSizeMultiplier={1.3} style={[styles.kicker, { color: colors.primary }]}>
              {kicker}
            </Text>
          ) : null}
          <Text accessibilityRole="header" maxFontSizeMultiplier={marketing ? 1.35 : 1.4} style={[marketing ? styles.displayTitle : styles.title, { color: colors.ink }]}>
            {title}
          </Text>
          <Text maxFontSizeMultiplier={1.5} style={[styles.lede, { color: colors.muted }]}>
            {lede}
          </Text>
          {error ? (
            <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
              {error}
            </Text>
          ) : null}
          <SearchField hideLabel={marketing} label={searchLabel} value={query} onChangeText={setQuery} />
          <Text style={[styles.sortNote, { color: colors.muted }]}>{serverSide ? "Mới nhất trước" : "Giá cao đến thấp"}</Text>
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {temperatureFilters.map((item) => (
              <ChoiceChip key={item.id} label={item.label} selected={group === item.id} onPress={() => setGroup(item.id)} />
            ))}
          </ScrollView>
          {primaryAction ? <PrimaryButton spaced={false} label={primaryAction.label} onPress={primaryAction.onPress} /> : null}
          {includeMarketplace ? (
            <>
              <MarketingSectionHead title="Đơn đang tìm xe" count={visibleBoard.length} />
              {marketError ? (
                <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
                  {marketError}
                </Text>
              ) : null}
              {visibleBoard.map((item) => (
                <View key={`board-${item.id}`} style={styles.inlineCard}>
                  <ShipmentCard
                    shipment={item}
                    saved={favorites.has(item.id)}
                    onOpen={() => {
                      if (!ownOrderIds.has(item.id)) return;
                      if (onOpenDetail) onOpenDetail(item.id);
                      else navigation.navigate("ShipmentDetail", { id: item.id });
                    }}
                    onToggleFavorite={() => void favorites.toggle(item)}
                  />
                </View>
              ))}
              <MarketingSectionHead title="Đơn của bạn" count={total ?? visible.length} />
            </>
          ) : sectionTitle ? (
            <MarketingSectionHead title={sectionTitle} count={total ?? visible.length} />
          ) : null}
          {mode === "mine" ? (
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {filters.map((item) => (
                <ChoiceChip key={item.id} label={item.label} selected={filter === item.id} onPress={() => setFilter(item.id)} />
              ))}
            </ScrollView>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <ShipmentCard
          shipment={item}
          saved={favorites.has(item.id)}
          onOpen={() => (onOpenDetail ? onOpenDetail(item.id) : navigation.navigate("ShipmentDetail", { id: item.id }))}
          onToggleFavorite={() => void favorites.toggle(item)}
        />
      )}
      ItemSeparatorComponent={() => <View style={marketing || includeMarketplace ? styles.gapWide : styles.gap} />}
      ListFooterComponent={
        serverSide && (loadingMore || moreError || hasMore) ? (
          <View style={styles.footer}>
            {loadingMore ? <LoadingBlock label="Đang tải thêm" /> : null}
            {moreError ? (
              <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
                {moreError}
              </Text>
            ) : null}
            {!loadingMore && (moreError || hasMore) ? (
              <PrimaryButton spaced={false} label={moreError ? "Thử tải lại" : "Tải thêm"} onPress={() => void loadMore()} />
            ) : null}
          </View>
        ) : undefined
      }
      ListEmptyComponent={
        <EmptyState
          title={query.trim() || filter !== "all" || group !== "ALL" ? "Không có đơn khớp" : emptyTitle}
          body={query.trim() || filter !== "all" || group !== "ALL" ? "Thử từ khóa khác hoặc bỏ bộ lọc." : emptyBody}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, paddingBottom: 96, flexGrow: 1 },
  header: { gap: space.md, marginBottom: space.lg },
  kicker: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18, letterSpacing: 0.4 },
  displayTitle: { ...type.display },
  title: { ...type.screenTitle },
  lede: { ...type.body },
  error: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20 },
  sortNote: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  chips: { gap: space.sm, paddingVertical: space.xs },
  gap: { height: space.md },
  gapWide: { height: space.lg },
  inlineCard: { marginBottom: space.lg },
  fill: { flex: 1 },
  footer: { gap: space.md, paddingTop: space.lg },
});

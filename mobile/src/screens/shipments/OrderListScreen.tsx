import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChoiceChip, EmptyState, ErrorState, LoadingBlock, SearchField } from "../../components/common/Feedback";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { CatalogFilterBar } from "../../components/layout/CatalogFilterBar";
import { BoardListPromoHero } from "../../components/layout/BoardListPromoHero";
import { MarketingSectionHead } from "../../components/layout/MarketingSectionHead";
import { ShipmentCard } from "../../components/shipment/ShipmentCard";
import { space, type, useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import { useFavorites } from "../../features/favorites/FavoritesProvider";
import type { RootStackParamList } from "../../navigation/types";
import { ApiError } from "../../services/api/client";
import { listMarketplaceShipments, listShipments, type ListMode } from "../../services/api/shipments";
import type { Shipment, ShipmentStatus } from "../../types/shipment";
import {
  catalogFiltersActive,
  defaultCatalogFilters,
  prepareCatalog,
  type CatalogFilters,
} from "../../utils/catalog";

const shipperFilters: { id: string; label: string; statuses: readonly ShipmentStatus[] | null }[] = [
  { id: "all", label: "Tất cả", statuses: null },
  { id: "open", label: "Đang tìm xe", statuses: ["PUBLISHED"] },
  { id: "running", label: "Đang giao", statuses: ["MATCHED", "PICKUP_CONFIRMED", "IN_TRANSIT"] },
  { id: "done", label: "Đã giao", statuses: ["DELIVERY_CONFIRMED", "COMPLETED"] },
  { id: "cancelled", label: "Đã hủy", statuses: ["CANCELLED"] },
];

const driverFilters: { id: string; label: string; statuses: readonly ShipmentStatus[] | null }[] = [
  { id: "all", label: "Tất cả", statuses: null },
  { id: "pickup", label: "Chờ lấy hàng", statuses: ["MATCHED"] },
  { id: "running", label: "Đang giao", statuses: ["PICKUP_CONFIRMED", "IN_TRANSIT"] },
  { id: "done", label: "Đã giao", statuses: ["DELIVERY_CONFIRMED", "COMPLETED"] },
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
  searchPlaceholder,
  sectionTitle,
  primaryAction,
  includeMarketplace = false,
  boardPromo = false,
  promoArtIcon,
  onOpenFavorites,
  headerAddon,
  hubStatusFilter = null,
  marketplaceOnly = false,
  onListRefresh,
  listEpoch = 0,
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
  searchPlaceholder?: string;
  sectionTitle?: string;
  primaryAction?: { label: string; onPress: () => void };
  /** Block sàn (cùng API Landing) phía trên danh sách của chủ hàng. */
  includeMarketplace?: boolean;
  boardPromo?: boolean;
  promoArtIcon?: ComponentProps<typeof MaterialCommunityIcons>["name"];
  onOpenFavorites?: () => void;
  headerAddon?: ReactNode;
  /** Khi chọn hub chủ hàng: lọc cố định và ẩn chip trạng thái. */
  hubStatusFilter?: "running" | "gps" | null;
  /** Chỉ hiện sàn tìm đơn (hub Tìm đơn). */
  marketplaceOnly?: boolean;
  onListRefresh?: () => void;
  /** Tăng sau thao tác trên panel chi tiết (embedded) để tải lại danh sách. */
  listEpoch?: number;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { logout } = useAuth();
  const favorites = useFavorites();
  const [items, setItems] = useState<Shipment[] | null>(null);
  const [marketplace, setMarketplace] = useState<Shipment[]>([]);
  const [error, setError] = useState<ListError | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [catalogFilters, setCatalogFilters] = useState<CatalogFilters>(defaultCatalogFilters);

  const loadBoard = includeMarketplace || marketplaceOnly;

  const load = useCallback(
    async (pull: boolean) => {
      if (pull) setRefreshing(true);
      try {
        const [rows, board] = await Promise.all([
          listShipments(mode),
          loadBoard ? listMarketplaceShipments() : Promise.resolve([] as Shipment[]),
        ]);
        setItems(rows);
        setMarketplace(board);
        setError(null);
        onListRefresh?.();
      } catch (caught) {
        setError(classifyListError(caught));
      } finally {
        setRefreshing(false);
      }
    },
    [includeMarketplace, loadBoard, mode, onListRefresh],
  );

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  useEffect(() => {
    if (listEpoch < 1) return;
    void load(false);
  }, [listEpoch, load]);

  const visibleBoard = useMemo(() => prepareCatalog(marketplace, query, catalogFilters), [catalogFilters, marketplace, query]);
  const ownOrderIds = useMemo(() => new Set((items ?? []).map((row) => row.id)), [items]);

  const visible = useMemo(() => {
    const source = items ?? [];
    if (mode === "mine" && hubStatusFilter === "gps") {
      return prepareCatalog(
        source.filter((item) => item.hasGpsUpdate),
        query,
        catalogFilters,
      );
    }
    const statusFilters = mode === "driver" ? driverFilters : shipperFilters;
    const effectiveFilter = hubStatusFilter ?? filter;
    const selected = statusFilters.find((item) => item.id === effectiveFilter);
    const byStatus =
      (mode === "mine" || mode === "driver") && selected?.statuses
        ? source.filter((item) => selected.statuses?.includes(item.status))
        : source;
    return prepareCatalog(byStatus, query, catalogFilters);
  }, [catalogFilters, filter, hubStatusFilter, items, marketplaceOnly, mode, query]);

  const listRows = marketplaceOnly ? visibleBoard : visible;

  const filtering = marketplaceOnly
    ? catalogFiltersActive(catalogFilters, query)
    : catalogFiltersActive(catalogFilters, query) ||
      (mode === "mine" && (hubStatusFilter === "gps" || (hubStatusFilter ?? filter) !== "all")) ||
      (mode === "driver" && filter !== "all");

  if (items === null && error) {
    return (
      <ErrorState
        title={listErrorTitle[error.kind]}
        message={error.message}
        actionLabel={error.kind === "session" ? "Đăng nhập lại" : "Thử lại"}
        onRetry={() => {
          if (error.kind === "session") void logout();
          else void load(false);
        }}
      />
    );
  }
  if (items === null) return <LoadingBlock label="Đang tải danh sách" />;

  const marketing = Boolean(kicker) || boardPromo;

  return (
    <FlatList
      data={listRows}
      keyExtractor={(item) => (marketplaceOnly ? `find-${item.id}` : item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
      contentContainerStyle={styles.list}
      style={styles.fill}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      removeClippedSubviews={false}
      ListHeaderComponent={
        <View style={styles.header}>
          {boardPromo ? (
            <BoardListPromoHero
              title={title}
              subline={lede}
              query={query}
              onChangeQuery={setQuery}
              searchPlaceholder={searchPlaceholder ?? "Mô tả hàng, điểm lấy, điểm giao"}
              onFavoritesPress={onOpenFavorites}
              artIcon={promoArtIcon}
            />
          ) : (
            <>
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
            </>
          )}
          {headerAddon}
          {error ? (
            <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
              {error.message}
            </Text>
          ) : null}
          {!boardPromo ? <SearchField hideLabel={marketing} label={searchLabel} value={query} onChangeText={setQuery} /> : null}
          <CatalogFilterBar filters={catalogFilters} onChange={(patch) => setCatalogFilters((current) => ({ ...current, ...patch }))} />
          {primaryAction ? <PrimaryButton spaced={false} label={primaryAction.label} onPress={primaryAction.onPress} /> : null}
          {includeMarketplace ? (
            <>
              <MarketingSectionHead title="Đơn đang tìm xe" count={visibleBoard.length} />
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
              <MarketingSectionHead title="Đơn của bạn" count={visible.length} />
            </>
          ) : sectionTitle ? (
            <MarketingSectionHead title={sectionTitle} count={listRows.length} />
          ) : marketplaceOnly ? (
            <MarketingSectionHead title="Tìm đơn" count={listRows.length} />
          ) : mode === "driver" ? (
            <MarketingSectionHead title="Chuyến được giao" count={listRows.length} />
          ) : mode === "mine" && !hubStatusFilter && !includeMarketplace ? (
            <MarketingSectionHead title="Đơn của bạn" count={listRows.length} />
          ) : null}
          {mode === "mine" && !hubStatusFilter && !marketplaceOnly ? (
            <View style={styles.chipRow}>
              {shipperFilters.map((item) => (
                <ChoiceChip key={item.id} label={item.label} selected={filter === item.id} onPress={() => setFilter(item.id)} />
              ))}
            </View>
          ) : null}
          {mode === "driver" ? (
            <View style={styles.chipRow}>
              {driverFilters.map((item) => (
                <ChoiceChip key={item.id} label={item.label} selected={filter === item.id} onPress={() => setFilter(item.id)} />
              ))}
            </View>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <ShipmentCard
          shipment={item}
          saved={favorites.has(item.id)}
          onOpen={() => {
            if (marketplaceOnly && !ownOrderIds.has(item.id)) return;
            if (onOpenDetail) onOpenDetail(item.id);
            else navigation.navigate("ShipmentDetail", { id: item.id });
          }}
          onToggleFavorite={() => void favorites.toggle(item)}
        />
      )}
      ItemSeparatorComponent={() => <View style={marketing || includeMarketplace || marketplaceOnly ? styles.gapWide : styles.gap} />}
      ListEmptyComponent={
        filtering ? (
          <View style={styles.emptyFilter}>
            <EmptyState title="Không có đơn khớp" body="Thử từ khóa khác hoặc bỏ bộ lọc." />
            <PrimaryButton
              spaced={false}
              label="Xóa bộ lọc"
              onPress={() => {
                setQuery("");
                setFilter("all");
                setCatalogFilters(defaultCatalogFilters);
              }}
            />
          </View>
        ) : (
          <EmptyState title={emptyTitle} body={emptyBody} />
        )
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.xs,
  },
  gap: { height: space.md },
  gapWide: { height: space.lg },
  inlineCard: { marginBottom: space.lg },
  fill: { flex: 1 },
  emptyFilter: { gap: space.md },
});

type ListErrorKind = "network" | "session" | "forbidden" | "other";

type ListError = { message: string; kind: ListErrorKind };

const listErrorTitle: Record<ListErrorKind, string> = {
  network: "Mất kết nối",
  session: "Hết phiên đăng nhập",
  forbidden: "Không có quyền truy cập",
  other: "Chưa tải được",
};

function classifyListError(caught: unknown): ListError {
  if (!(caught instanceof ApiError)) return { message: "Không tải được danh sách.", kind: "other" };
  if (caught.status === 401 || caught.code === "unauthenticated") return { message: caught.message, kind: "session" };
  if (caught.status === 403) return { message: caught.message, kind: "forbidden" };
  if (caught.status === 0 || caught.code === "network_error") return { message: caught.message, kind: "network" };
  return { message: caught.message, kind: "other" };
}

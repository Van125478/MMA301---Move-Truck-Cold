import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { FlatList, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChoiceChip, EmptyState, ErrorState, LoadingBlock, SearchField } from "../../components/common/Feedback";
import { PrimaryButton } from "../../components/common/PrimaryButton";
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
import { prepareCatalog, temperatureFilters, type TemperatureFilter } from "../../utils/catalog";

const filters: { id: string; label: string; statuses: readonly ShipmentStatus[] | null }[] = [
  { id: "all", label: "Tất cả", statuses: null },
  { id: "open", label: "Đang tìm xe", statuses: ["PUBLISHED"] },
  { id: "running", label: "Đang chạy", statuses: ["MATCHED", "PICKUP_CONFIRMED", "IN_TRANSIT"] },
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
  const [group, setGroup] = useState<TemperatureFilter>("ALL");

  const load = useCallback(
    async (pull: boolean) => {
      if (pull) setRefreshing(true);
      try {
        const [rows, board] = await Promise.all([
          listShipments(mode),
          includeMarketplace ? listMarketplaceShipments() : Promise.resolve([] as Shipment[]),
        ]);
        setItems(rows);
        setMarketplace(board);
        setError(null);
      } catch (caught) {
        setError(classifyListError(caught));
      } finally {
        setRefreshing(false);
      }
    },
    [includeMarketplace, mode],
  );

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  const visibleBoard = useMemo(() => prepareCatalog(marketplace, query, group), [group, marketplace, query]);
  const ownOrderIds = useMemo(() => new Set((items ?? []).map((row) => row.id)), [items]);

  const visible = useMemo(() => {
    const source = items ?? [];
    const selected = filters.find((item) => item.id === filter);
    const byStatus =
      mode === "mine" && selected?.statuses ? source.filter((item) => selected.statuses?.includes(item.status)) : source;
    return prepareCatalog(byStatus, query, group);
  }, [filter, group, items, mode, query]);

  const filtering = query.trim().length > 0 || (mode === "mine" && filter !== "all") || group !== "ALL";

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
      data={visible}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
      contentContainerStyle={styles.list}
      style={styles.fill}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      removeClippedSubviews={Platform.OS === "android"}
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
          <Text style={[styles.sortNote, { color: colors.muted }]}>Giá cao đến thấp</Text>
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {temperatureFilters.map((item) => (
              <ChoiceChip key={item.id} label={item.label} selected={group === item.id} onPress={() => setGroup(item.id)} />
            ))}
          </ScrollView>
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
            <MarketingSectionHead title={sectionTitle} count={visible.length} />
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
                setGroup("ALL");
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
  sortNote: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  chips: { gap: space.sm, paddingVertical: space.xs },
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

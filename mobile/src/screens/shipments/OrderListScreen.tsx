import { useCallback, useMemo, useState } from "react";
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
  sectionTitle,
  primaryAction,
  includeMarketplace = false,
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
}) {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { logout } = useAuth();
  const favorites = useFavorites();
  const [items, setItems] = useState<Shipment[] | null>(null);
  const [marketplace, setMarketplace] = useState<Shipment[]>([]);
  const [error, setError] = useState<string | null>(null);
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
        if (caught instanceof ApiError && caught.status === 401) {
          await logout();
          return;
        }
        setError(caught instanceof ApiError ? caught.message : "Không tải được danh sách.");
      } finally {
        setRefreshing(false);
      }
    },
    [includeMarketplace, logout, mode],
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

  if (items === null && error) return <ErrorState message={error} onRetry={() => void load(false)} />;
  if (items === null) return <LoadingBlock label="Đang tải danh sách" />;

  const marketing = Boolean(kicker);

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
});

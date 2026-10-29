import { useCallback, useMemo, useState } from "react";
import { FlatList, Platform, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { EmptyState, ErrorState, LoadingBlock } from "../../components/common/Feedback";import { CatalogFilterBar } from "../../components/layout/CatalogFilterBar";
import { BoardListPromoHero } from "../../components/layout/BoardListPromoHero";
import { ShipmentCard } from "../../components/shipment/ShipmentCard";
import {
  ClaimedStatusFilters,
  claimedBucket,
  type ClaimedStatusKey,
  type ClaimedViewFilter,
} from "../../components/shipments/ClaimedStatusFilters";
import { space, useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import { useFavorites } from "../../features/favorites/FavoritesProvider";
import type { RootStackParamList } from "../../navigation/types";
import { ApiError } from "../../services/api/client";
import { listShipments } from "../../services/api/shipments";
import type { Shipment } from "../../types/shipment";
import {
  catalogFiltersActive,
  defaultCatalogFilters,
  prepareCatalog,
  type CatalogFilters,
} from "../../utils/catalog";

export function ClaimedTripsScreen({ onOpenDetail }: { onOpenDetail?: (id: string) => void }) {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { logout } = useAuth();
  const favorites = useFavorites();
  const [items, setItems] = useState<Shipment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [catalogFilters, setCatalogFilters] = useState<CatalogFilters>(defaultCatalogFilters);
  const [bucket, setBucket] = useState<ClaimedViewFilter>("all");

  const load = useCallback(
    async (pull: boolean) => {
      if (pull) setRefreshing(true);
      try {
        setItems(await listShipments("claimed"));
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
    [logout],
  );

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  const counts = useMemo(() => {
    const base: Record<ClaimedStatusKey, number> = { assign: 0, pickup: 0, running: 0, done: 0, cancelled: 0 };
    for (const row of items ?? []) {
      base[claimedBucket(row)] += 1;
    }
    return base;
  }, [items]);

  const filtered = useMemo(() => {
    const source = items ?? [];
    return bucket === "all" ? source : source.filter((row) => claimedBucket(row) === bucket);
  }, [bucket, items]);

  const visible = useMemo(() => prepareCatalog(filtered, query, catalogFilters), [catalogFilters, filtered, query]);

  const filtering = bucket !== "all" || catalogFiltersActive(catalogFilters, query);

  const open = useCallback(
    (id: string) => {
      if (onOpenDetail) onOpenDetail(id);
      else navigation.navigate("ShipmentDetail", { id });
    },
    [navigation, onOpenDetail],
  );

  if (items === null && error) return <ErrorState message={error} onRetry={() => void load(false)} />;
  if (items === null) return <LoadingBlock label="Đang tải chuyến đã nhận" />;

  return (
    <FlatList
      data={visible}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
      contentContainerStyle={styles.list}
      style={[styles.fill, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      removeClippedSubviews={Platform.OS === "android"}
      ListHeaderComponent={
        <View style={styles.header}>
          <BoardListPromoHero
            title="Đã nhận"
            subline="Lọc theo trạng thái và nhiệt độ. Sau phân công → Chờ lấy hàng; tài xế xác nhận lấy → Đang chạy."
            query={query}
            onChangeQuery={setQuery}
            searchPlaceholder="Mô tả hàng, điểm lấy, điểm giao"
            artIcon="clipboard-check-outline"
          />
          {error ? (
            <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
              {error}
            </Text>
          ) : null}
          <ClaimedStatusFilters active={bucket} counts={counts} onChange={setBucket} />
          <CatalogFilterBar
            hideVehicleAll
            filters={catalogFilters}
            onChange={(patch) => setCatalogFilters((current) => ({ ...current, ...patch }))}
          />
          <Text style={[styles.section, { color: colors.ink }]}>Danh sách chuyến · {visible.length}</Text>        </View>
      }
      renderItem={({ item }) => (
        <ShipmentCard
          shipment={item}
          saved={favorites.has(item.id)}
          onOpen={() => open(item.id)}
          onToggleFavorite={() => void favorites.toggle(item)}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      ListEmptyComponent={
        <EmptyState
          title={filtering ? "Không có chuyến khớp" : "Chưa nhận chuyến"}
          body={filtering ? "Thử bộ lọc khác hoặc từ khóa khác." : "Vào sàn chuyến để nhận đơn đang tìm xe."}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { padding: space.lg, paddingBottom: 96, flexGrow: 1 },
  header: { gap: space.md, marginBottom: space.lg },
  error: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20 },
  section: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },  gap: { height: space.md },
});

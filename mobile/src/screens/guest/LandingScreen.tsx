import { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorState, LoadingBlock } from "../../components/common/Feedback";
import { PhoneFrame } from "../../components/common/PhoneFrame";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { CatalogFilterBar } from "../../components/layout/CatalogFilterBar";
import { BoardListPromoHero } from "../../components/layout/BoardListPromoHero";
import { MarketingSectionHead } from "../../components/layout/MarketingSectionHead";
import { DomesticDieselCard } from "../../components/market/DomesticDieselCard";
import { ScreenTopBar } from "../../components/layout/ScreenTopBar";
import { GuestTabBar } from "../../components/navigation/GuestTabBar";
import { ShipmentCard } from "../../components/shipment/ShipmentCard";
import { space, useTheme } from "../../constants/theme";
import { useFavorites } from "../../features/favorites/FavoritesProvider";
import type { RootStackParamList } from "../../navigation/types";
import { listMarketplaceShipments } from "../../services/api/shipments";
import type { Shipment } from "../../types/shipment";
import { defaultCatalogFilters, prepareCatalog, type CatalogFilters } from "../../utils/catalog";

export function LandingScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const favorites = useFavorites();
  const [items, setItems] = useState<Shipment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [catalogFilters, setCatalogFilters] = useState<CatalogFilters>(defaultCatalogFilters);
  const loaded = useRef(false);

  const load = useCallback(async (pull: boolean) => {
    if (pull) setRefreshing(true);
    try {
      const rows = await listMarketplaceShipments();
      setItems(rows);
      setError(null);
    } catch {
      setError("Không tải được danh sách đơn trên sàn.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (loaded.current) return;
      loaded.current = true;
      void load(false);
    }, [load]),
  );

  const visible = useMemo(() => prepareCatalog(items ?? [], query, catalogFilters), [catalogFilters, items, query]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safe, { backgroundColor: colors.background }]}>
      <PhoneFrame style={styles.frame}>
        <View style={styles.shell}>
          <ScreenTopBar />
          {items === null && error ? (
            <ErrorState message={error} onRetry={() => void load(false)} />
          ) : items === null ? (
            <LoadingBlock label="Đang tải sàn vận chuyển" />
          ) : (
            <FlatList
              style={styles.listFill}
              data={visible}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              keyExtractor={(item) => item.id}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
              contentContainerStyle={styles.list}
              ListHeaderComponent={
                <View style={styles.header}>
                  <BoardListPromoHero
                    title="Sàn chuyến"
                    subline="Đơn đang tìm xe. Nhà xe tự nhận, không có máy ghép."
                    query={query}
                    onChangeQuery={setQuery}
                    searchPlaceholder="Mô tả hàng, điểm lấy, điểm giao"
                    onFavoritesPress={() => navigation.navigate("GuestSaved")}
                  />
                  <CatalogFilterBar
                    filters={catalogFilters}
                    onChange={(patch) => setCatalogFilters((current) => ({ ...current, ...patch }))}
                  />
                  <DomesticDieselCard />
                <PrimaryButton spaced={false} label="Đăng nhập để đăng đơn" onPress={() => navigation.navigate("Login")} />
                  <MarketingSectionHead title="Đơn đang tìm xe" count={visible.length} />
                  {error ? (
                    <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
                      {error}
                    </Text>
                  ) : null}
                </View>
              }
              renderItem={({ item }) => (
                <ShipmentCard
                  shipment={item}
                  saved={favorites.has(item.id)}
                  onOpen={() => navigation.navigate("Login")}
                  onToggleFavorite={() => void favorites.toggle(item)}
                />
              )}
              ItemSeparatorComponent={() => <View style={styles.gap} />}
              ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>Không có đơn khớp bộ lọc.</Text>}
            />
          )}
        </View>
        <GuestTabBar active="explore" />
      </PhoneFrame>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  frame: { flex: 1 },
  shell: { flex: 1, minHeight: 0 },
  listFill: { flex: 1 },
  list: { padding: space.lg, paddingBottom: space.xxl, flexGrow: 1 },
  header: { gap: space.md, marginBottom: space.lg },
  error: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20 },
  gap: { height: space.lg },
  empty: { textAlign: "center", marginTop: space.xl, fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 24 },
});

import { useCallback, useMemo, useState } from "react";
import { FlatList, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChoiceChip, EmptyState, ErrorState, LoadingBlock, SearchField } from "../../components/common/Feedback";
import { ShipmentCard } from "../../components/shipment/ShipmentCard";
import {
  ClaimedStatusFilters,
  claimedBucket,
  type ClaimedStatusKey,
  type ClaimedViewFilter,
} from "../../components/shipments/ClaimedStatusFilters";
import { space, type, useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import { useFavorites } from "../../features/favorites/FavoritesProvider";
import type { RootStackParamList } from "../../navigation/types";
import { ApiError } from "../../services/api/client";
import { listShipments } from "../../services/api/shipments";
import type { Shipment } from "../../types/shipment";
import { prepareCatalog, temperatureFilters, type TemperatureFilter } from "../../utils/catalog";

const temperatureChips = temperatureFilters.filter((item) => item.id !== "ALL");

export function ClaimedTripsScreen({ onOpenDetail }: { onOpenDetail?: (id: string) => void }) {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { logout } = useAuth();
  const favorites = useFavorites();
  const [items, setItems] = useState<Shipment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<TemperatureFilter>("ALL");
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
    const base: Record<ClaimedStatusKey, number> = { assign: 0, running: 0, done: 0, cancelled: 0 };
    for (const row of items ?? []) {
      base[claimedBucket(row)] += 1;
    }
    return base;
  }, [items]);

  const filtered = useMemo(() => {
    const source = items ?? [];
    return bucket === "all" ? source : source.filter((row) => claimedBucket(row) === bucket);
  }, [bucket, items]);

  const visible = useMemo(() => prepareCatalog(filtered, query, group), [filtered, group, query]);

  const filtering = bucket !== "all" || group !== "ALL" || query.trim().length > 0;

  const open = useCallback(
    (id: string) => {
      if (onOpenDetail) onOpenDetail(id);
      else navigation.navigate("ShipmentDetail", { id });
    },
    [navigation, onOpenDetail],
  );

  const toggleTemperature = useCallback((id: TemperatureFilter) => {
    setGroup((current) => (current === id ? "ALL" : id));
  }, []);

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
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} style={[styles.title, { color: colors.ink }]}>
            Chuyến đã nhận ({items.length})
          </Text>
          <Text maxFontSizeMultiplier={1.45} style={[styles.lede, { color: colors.muted }]}>
            Bấm icon trạng thái hoặc nhóm nhiệt để lọc. Bấm lại để bỏ lọc. Mở thẻ để phân công.
          </Text>
          {error ? (
            <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
              {error}
            </Text>
          ) : null}
          <ClaimedStatusFilters active={bucket} counts={counts} onChange={setBucket} />
          <SearchField hideLabel label="Tìm trong chuyến đã nhận" value={query} onChangeText={setQuery} />
          <Text style={[styles.sortNote, { color: colors.muted }]}>Giá cao đến thấp</Text>
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {temperatureChips.map((item) => (
              <ChoiceChip key={item.id} label={item.label} selected={group === item.id} onPress={() => toggleTemperature(item.id)} />
            ))}
          </ScrollView>
          <Text style={[styles.section, { color: colors.ink }]}>Danh sách chuyến · {visible.length}</Text>
        </View>
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
  title: { ...type.screenTitle },
  lede: { ...type.body },
  error: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20 },
  sortNote: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  chips: { gap: space.sm, paddingVertical: space.xs },
  section: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  gap: { height: space.md },
});

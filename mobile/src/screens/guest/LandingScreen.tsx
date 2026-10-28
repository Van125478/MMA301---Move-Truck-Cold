import { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChoiceChip, ErrorState, LoadingBlock } from "../../components/common/Feedback";
import { PhoneFrame } from "../../components/common/PhoneFrame";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { BoardListPromoHero } from "../../components/layout/BoardListPromoHero";
import { MarketingSectionHead } from "../../components/layout/MarketingSectionHead";
import { DomesticDieselCard } from "../../components/market/DomesticDieselCard";
import { ScreenTopBar } from "../../components/layout/ScreenTopBar";
import { GuestTabBar } from "../../components/navigation/GuestTabBar";
import { ShipmentCard } from "../../components/shipment/ShipmentCard";
import { space, useTheme } from "../../constants/theme";
import type { RootStackParamList } from "../../navigation/types";
import { listMarketplaceShipments } from "../../services/api/shipments";
import type { Shipment } from "../../types/shipment";
import { prepareCatalog, temperatureFilters, type TemperatureFilter } from "../../utils/catalog";

export function LandingScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<Shipment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<TemperatureFilter>("ALL");
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

  const visible = useMemo(() => prepareCatalog(items ?? [], query, group), [group, items, query]);

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
                  />
                  <Text style={[styles.sortNote, { color: colors.muted }]}>Giá cao đến thấp</Text>
                  <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {temperatureFilters.map((item) => (
                      <ChoiceChip key={item.id} label={item.label} selected={group === item.id} onPress={() => setGroup(item.id)} />
                    ))}
                  </ScrollView>
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
              renderItem={({ item }) => <ShipmentCard shipment={item} saved={false} onOpen={() => navigation.navigate("Login")} />}
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
  sortNote: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  chips: { gap: space.sm, paddingVertical: space.xs },
  gap: { height: space.lg },
  empty: { textAlign: "center", marginTop: space.xl, fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 24 },
});

import { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChoiceChip, ErrorState, LoadingBlock, SearchField } from "../../components/common/Feedback";
import { PhoneFrame } from "../../components/common/PhoneFrame";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { MarketingSectionHead } from "../../components/layout/MarketingSectionHead";
import { ScreenTopBar } from "../../components/layout/ScreenTopBar";
import { GuestTabBar } from "../../components/navigation/GuestTabBar";
import { ShipmentCard } from "../../components/shipment/ShipmentCard";
import { space, type, useTheme } from "../../constants/theme";
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
                  <Text maxFontSizeMultiplier={1.3} style={[styles.kicker, { color: colors.primary }]}>
                    Giải pháp · Chủ hàng
                  </Text>
                  <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} style={[styles.title, { color: colors.ink }]}>
                    Chủ động gửi hàng lạnh, theo dõi hành trình rõ ràng.
                  </Text>
                  <Text maxFontSizeMultiplier={1.5} style={[styles.lede, { color: colors.muted }]}>
                    Đăng nhu cầu vận chuyển với hàng hóa, điểm lấy, điểm giao và nhóm nhiệt. Nhà xe xem đơn và tự nhận chuyến.
                  </Text>
                  <SearchField hideLabel label="Tìm hàng, điểm lấy, điểm giao" value={query} onChangeText={setQuery} />
                  <Text style={[styles.sortNote, { color: colors.muted }]}>Giá cao đến thấp</Text>
                  <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {temperatureFilters.map((item) => (
                      <ChoiceChip key={item.id} label={item.label} selected={group === item.id} onPress={() => setGroup(item.id)} />
                    ))}
                  </ScrollView>
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
  kicker: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18, letterSpacing: 0.4 },
  title: { ...type.display },
  lede: { ...type.body },
  error: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20 },
  sortNote: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  chips: { gap: space.sm, paddingVertical: space.xs },
  gap: { height: space.lg },
  empty: { textAlign: "center", marginTop: space.xl, ...type.body },
});

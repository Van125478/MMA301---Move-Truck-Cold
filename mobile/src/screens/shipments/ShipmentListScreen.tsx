import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, TextInput, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShipmentCard } from "../../components/shipment/ShipmentCard";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { space, type as textType, useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import { useMyShipments, type ShipmentListErrorKind } from "../../features/shipments/useMyShipments";
import { filterShipments, statusFilters, type StatusFilter } from "../../utils/shipmentFilter";
import type { RootStackParamList } from "../../navigation/types";

const errorIconByKind: Record<ShipmentListErrorKind, keyof typeof MaterialCommunityIcons.glyphMap> = {
  network: "wifi-off",
  session: "lock-outline",
  forbidden: "shield-alert-outline",
  notFound: "file-search-outline",
  server: "alert-circle-outline",
};

const errorTitleByKind: Record<ShipmentListErrorKind, string> = {
  network: "Mất kết nối",
  session: "Hết phiên đăng nhập",
  forbidden: "Không có quyền truy cập",
  notFound: "Không tìm thấy",
  server: "Máy chủ gặp lỗi",
};

export function ShipmentListScreen() {
  const { colors } = useTheme();
  const { logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, refreshing, refresh, reload } = useMyShipments();
  const firstFocus = useRef(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const allShipments = state.status === "ready" ? state.shipments : null;
  const visible = useMemo(() => (allShipments ? filterShipments(allShipments, query, filter) : []), [allShipments, query, filter]);

  // Tải lại âm thầm khi quay về danh sách (sau khi tạo hoặc hủy đơn).
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void reload({ silent: true });
    }, [reload]),
  );

  if (state.status === "loading") {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View accessibilityRole="progressbar" accessibilityLabel="Đang tải danh sách đơn" style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.body, { color: colors.muted, marginTop: space.md }]}>Đang tải danh sách đơn…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === "error") {
    const isSessionError = state.kind === "session";
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View accessibilityRole="alert" style={styles.center}>
          <MaterialCommunityIcons name={errorIconByKind[state.kind]} size={40} color={colors.danger} />
          <Text accessibilityRole="header" style={[styles.errorTitle, { color: colors.ink, marginTop: space.md }]}>
            {errorTitleByKind[state.kind]}
          </Text>
          <Text style={[styles.body, { color: colors.muted, textAlign: "center", marginTop: space.sm }]}>{state.message}</Text>
          {isSessionError ? (
            <PrimaryButton label="Đăng nhập lại" onPress={() => void logout()} />
          ) : (
            <PrimaryButton label="Thử lại" onPress={() => void reload()} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const total = allShipments?.length ?? 0;
  const isEmpty = total === 0;
  const filtering = query.trim() !== "" || filter !== "ALL";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTexts}>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={[styles.headerTitle, { color: colors.ink }]}>
              Đơn hàng của tôi
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {isEmpty ? "Chưa có đơn nào." : filtering ? `${visible.length}/${total} đơn.` : `${total} đơn.`}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đăng đơn mới"
            onPress={() => navigation.navigate("CreateShipment")}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <MaterialCommunityIcons name="plus" size={24} color={colors.onPrimary} />
          </Pressable>
        </View>
        {isEmpty ? null : (
          <>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm theo hàng hóa, địa điểm, mã đơn…"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Tìm đơn hàng"
              returnKeyType="search"
              autoCorrect={false}
              style={[styles.search, { color: colors.ink, borderColor: colors.muted, backgroundColor: colors.badge }]}
            />
            <View style={styles.chips}>
              {statusFilters.map((f) => {
                const selected = f.key === filter;
                return (
                  <Pressable
                    key={f.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setFilter(f.key)}
                    style={[styles.chip, { backgroundColor: selected ? colors.primary : colors.badge }]}
                  >
                    <Text style={[styles.chipText, { color: selected ? colors.onPrimary : colors.ink }]}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={visible.length === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
        renderItem={({ item }) => <ShipmentCard shipment={item} onPress={() => navigation.navigate("ShipmentDetail", { id: item.id })} />}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !isEmpty ? (
            <View accessibilityRole="text" style={styles.emptyState}>
              <Text accessibilityRole="header" style={[styles.emptyTitle, { color: colors.ink }]}>Không có đơn phù hợp</Text>
              <PrimaryButton label="Xóa bộ lọc" onPress={() => { setQuery(""); setFilter("ALL"); }} />
            </View>
          ) : (
          <View accessibilityRole="text" style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.badge }]}>
              <MaterialCommunityIcons name="package-variant-closed" size={36} color={colors.primary} />
            </View>
            <Text accessibilityRole="header" style={[styles.emptyTitle, { color: colors.ink }]}>
              Chưa có đơn hàng nào
            </Text>
            <Text style={[styles.body, { color: colors.muted, textAlign: "center", marginTop: space.sm }]}>
              Các đơn bạn đăng để tìm nhà xe sẽ hiển thị ở đây. Kéo xuống để làm mới sau khi bạn tạo đơn mới.
            </Text>
            <PrimaryButton label="Làm mới" onPress={() => void refresh()} pending={refreshing} pendingLabel="Đang làm mới…" />
          </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.md },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.md },
  headerTexts: { flex: 1 },
  addButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  search: { marginTop: space.md, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: space.md, paddingVertical: space.sm, fontSize: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
  chip: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: 16 },
  chipText: { fontSize: 14, fontWeight: "600" },
  headerTitle: { ...textType.display },
  errorTitle: { ...textType.title },
  subtitle: { ...textType.body, marginTop: space.xs },
  list: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xxl },
  emptyList: { flexGrow: 1, paddingHorizontal: space.xl },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: space.xxxl },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { ...textType.title, marginTop: space.lg, textAlign: "center" },
  body: { ...textType.body },
});

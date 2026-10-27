import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ConfirmDialog, EmptyState, LoadingBlock } from "../../components/common/Feedback";
import { ShipmentCard } from "../../components/shipment/ShipmentCard";
import { pointer } from "../../constants/hit";
import { radius, space, type, useTheme } from "../../constants/theme";
import { useFavorites } from "../../features/favorites/FavoritesProvider";
import { favoriteFrom } from "../../features/favorites/store";
import type { RootStackParamList } from "../../navigation/types";
import type { Shipment } from "../../types/shipment";

export function FavoritesScreen({
  onOpenDetail,
  kicker,
  title = "Yêu thích",
  lede = "Đơn và chuyến bạn đã lưu trên máy này.",
}: {
  onOpenDetail?: (id: string) => void;
  kicker?: string;
  title?: string;
  lede?: string;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const favorites = useFavorites();
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  if (!favorites.ready) return <LoadingBlock label="Đang mở danh sách yêu thích" />;

  return (
    <>
      <FlatList
        data={favorites.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        style={styles.fill}
        ListHeaderComponent={
          <View style={styles.header}>
            {kicker ? (
              <Text maxFontSizeMultiplier={1.3} style={[styles.kicker, { color: colors.primary }]}>
                {kicker}
              </Text>
            ) : null}
            <Text accessibilityRole="header" maxFontSizeMultiplier={kicker ? 1.35 : 1.4} style={[kicker ? styles.displayTitle : styles.title, { color: colors.ink }]}>
              {title}
            </Text>
            <Text maxFontSizeMultiplier={1.5} style={[styles.lede, { color: colors.muted }]}>
              {lede}
            </Text>
            {favorites.items.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xóa tất cả yêu thích"
                onPress={() => setConfirmClear(true)}
                style={[styles.clearAll, pointer, { borderColor: colors.line, backgroundColor: colors.surface }]}
              >
                <Text style={[styles.clearAllText, { color: colors.danger }]}>Xóa tất cả yêu thích</Text>
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const shipment = snapshotShipment(item);
          return (
            <ShipmentCard
              shipment={shipment}
              saved
              onOpen={() => (onOpenDetail ? onOpenDetail(item.id) : navigation.navigate("ShipmentDetail", { id: item.id }))}
              onToggleFavorite={() => void favorites.remove(item.id)}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={kicker ? styles.gapWide : styles.gap} />}
        ListEmptyComponent={<EmptyState title="Chưa có mục yêu thích" body="Bấm trái tim trên đơn hoặc chuyến đang xem được. Mỗi mã chỉ lưu một lần." />}
      />
      <ConfirmDialog
        visible={confirmClear}
        title="Xóa tất cả yêu thích?"
        body="Danh sách trên máy này sẽ trống. Thao tác này không hủy đơn trên máy chủ."
        confirmLabel="Xóa tất cả"
        tone="danger"
        pending={clearing}
        onCancel={() => {
          if (!clearing) setConfirmClear(false);
        }}
        onConfirm={() => {
          setClearing(true);
          void favorites
            .clearAll()
            .then(() => setConfirmClear(false))
            .finally(() => setClearing(false));
        }}
      />
    </>
  );
}

function snapshotShipment(item: ReturnType<typeof favoriteFrom>): Shipment {
  return {
    id: item.id,
    cargoDescription: item.cargoDescription,
    pickupCompany: null,
    pickupLocation: item.pickupLocation,
    pickupContactName: null,
    pickupPhone: null,
    pickupDate: item.pickupDate,
    pickupTimeFrom: item.pickupTimeFrom,
    pickupTimeTo: item.pickupTimeTo,
    deliveryCompany: null,
    deliveryLocation: item.deliveryLocation,
    deliveryContactName: null,
    deliveryPhone: null,
    deliveryDate: null,
    deliveryTimeFrom: null,
    deliveryTimeTo: null,
    cargoWeightTon: null,
    cargoVolumeM3: null,
    packageCount: null,
    temperatureGroup: "COOL",
    temperatureLabel: item.temperatureLabel,
    vehicleRequirement: "",
    listedPriceVnd: item.listedPriceVnd,
    status: item.status,
    statusLabel: item.statusLabel || "Đã lưu",
    carrierId: null,
    vehicleId: null,
    driverId: null,
    vehicleLabel: null,
    driverName: null,
    pickupConfirmedAt: null,
    deliveryConfirmedAt: null,
    nextAction: null,
    timeline: [],
  };
}

const styles = StyleSheet.create({
  list: { padding: space.lg, paddingBottom: 96, flexGrow: 1 },
  header: { gap: space.md, marginBottom: space.lg },
  kicker: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18, letterSpacing: 0.4 },
  displayTitle: { ...type.display },
  title: { ...type.screenTitle },
  lede: { ...type.body },
  clearAll: {
    alignSelf: "flex-start",
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  clearAllText: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  gap: { height: space.md },
  gapWide: { height: space.lg },
  fill: { flex: 1 },
});

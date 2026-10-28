import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ConfirmDialog, EmptyState, LoadingBlock } from "../../components/common/Feedback";
import { SelectCircle } from "../../components/common/SelectCircle";
import { BoardListPromoHero } from "../../components/layout/BoardListPromoHero";
import { ShipmentCard } from "../../components/shipment/ShipmentCard";
import { pointer } from "../../constants/hit";
import { space, type, useTheme } from "../../constants/theme";
import { useFavorites } from "../../features/favorites/FavoritesProvider";
import { favoriteFrom } from "../../features/favorites/store";
import type { RootStackParamList } from "../../navigation/types";
import type { Shipment } from "../../types/shipment";
import { prepareCatalog } from "../../utils/catalog";

export function FavoritesScreen({
  onOpenDetail,
  kicker,
  title = "Yêu thích",
  lede = "Bấm trái tim để xóa một mục. Chỉnh sửa để chọn và xóa nhiều mục.",
  boardPromo = false,
  promoArtIcon,
}: {
  onOpenDetail?: (id: string) => void;
  kicker?: string;
  title?: string;
  lede?: string;
  boardPromo?: boolean;
  promoArtIcon?: React.ComponentProps<typeof import("@expo/vector-icons").MaterialCommunityIcons>["name"];
}) {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const favorites = useFavorites();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");

  const exitEditMode = useCallback(() => {
    setEditMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openDetail = useCallback(
    (id: string) => {
      if (onOpenDetail) onOpenDetail(id);
      else navigation.navigate("ShipmentDetail", { id });
    },
    [navigation, onOpenDetail],
  );

  const itemCount = favorites.items.length;
  const visibleItems = useMemo(() => {
    const rows = favorites.items.map((item) => snapshotShipment(item));
    return boardPromo ? prepareCatalog(rows, query, "ALL") : rows;
  }, [boardPromo, favorites.items, query]);
  const visibleCount = visibleItems.length;
  const selectedCount = selectedIds.size;
  const allSelected = itemCount > 0 && selectedCount === itemCount;

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(favorites.items.map((item) => item.id)));
  }, [allSelected, favorites.items]);

  const listBottomPad = useMemo(() => (editMode && itemCount > 0 ? 160 : 96), [editMode, itemCount]);

  if (!favorites.ready) return <LoadingBlock label="Đang mở danh sách yêu thích" />;

  return (
    <View style={styles.fill}>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: listBottomPad }]}
        style={styles.fill}
        ListHeaderComponent={
          <View style={styles.header}>
            {boardPromo ? (
              <BoardListPromoHero
                title={title}
                subline={lede}
                query={query}
                onChangeQuery={setQuery}
                searchPlaceholder="Mô tả hàng, điểm lấy, điểm giao"
                artIcon={promoArtIcon ?? "heart-outline"}
              />
            ) : null}
            {!boardPromo && kicker ? (
              <Text maxFontSizeMultiplier={1.3} style={[styles.kicker, { color: colors.primary }]}>
                {kicker}
              </Text>
            ) : null}
            <View style={styles.titleRow}>
              {!boardPromo ? (
                <Text
                  accessibilityRole="header"
                  maxFontSizeMultiplier={kicker ? 1.35 : 1.4}
                  style={[kicker ? styles.displayTitle : styles.title, styles.titleFlex, { color: colors.ink }]}
                >
                  {title} ({itemCount})
                </Text>
              ) : (
                <Text style={[styles.sectionMeta, { color: colors.ink }]}>
                  {visibleCount} mục{query.trim() ? " khớp" : ""}
                </Text>
              )}
              {itemCount > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={editMode ? "Xong chỉnh sửa" : "Chỉnh sửa danh sách yêu thích"}
                  onPress={() => (editMode ? exitEditMode() : setEditMode(true))}
                  style={[styles.editLink, pointer]}
                >
                  <Text style={[styles.editLinkText, { color: colors.primary }]}>{editMode ? "Xong" : "Chỉnh sửa"}</Text>
                </Pressable>
              ) : null}
            </View>
            {!boardPromo ? (
              <Text maxFontSizeMultiplier={1.5} style={[styles.lede, { color: colors.muted }]}>
                {editMode ? "Chọn mục cần xóa, rồi bấm Xóa ở thanh dưới." : lede}
              </Text>
            ) : editMode ? (
              <Text maxFontSizeMultiplier={1.5} style={[styles.lede, { color: colors.muted }]}>
                Chọn mục cần xóa, rồi bấm Xóa ở thanh dưới.
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const shipment = item;
          const favoriteId = item.id;
          const selected = selectedIds.has(favoriteId);
          return (
            <View style={styles.itemRow}>
              {editMode ? (
                <SelectCircle
                  selected={selected}
                  onPress={() => toggleSelected(favoriteId)}
                  label={`Chọn ${shipment.cargoDescription}`}
                />
              ) : null}
              <View style={styles.cardWrap}>
                <ShipmentCard
                  shipment={shipment}
                  saved
                  onOpen={() => (editMode ? toggleSelected(favoriteId) : openDetail(favoriteId))}
                  onToggleFavorite={editMode ? undefined : () => void favorites.remove(favoriteId)}
                />
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={boardPromo || kicker ? styles.gapWide : styles.gap} />}
        ListEmptyComponent={<EmptyState title="Chưa có mục yêu thích" body="Bấm trái tim trên đơn hoặc chuyến đang xem được. Mỗi mã chỉ lưu một lần." />}
      />

      {editMode && itemCount > 0 ? (
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.line }]}>
          <View style={styles.selectAll}>
            <SelectCircle inline selected={allSelected} onPress={toggleSelectAll} label="Chọn tất cả" />
            <Pressable accessibilityRole="button" accessibilityLabel="Chọn tất cả" onPress={toggleSelectAll} style={pointer}>
              <Text style={[styles.selectAllText, { color: colors.ink }]}>Tất cả</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xóa các mục đã chọn"
            disabled={selectedCount === 0}
            onPress={() => setConfirmDelete(true)}
            style={[styles.deleteBtn, pointer, { opacity: selectedCount === 0 ? 0.45 : 1 }]}
          >
            <Text style={[styles.deleteBtnText, { color: colors.danger }]}>
              Xóa{selectedCount > 0 ? ` (${selectedCount})` : ""}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirmDelete}
        title={
          selectedCount === itemCount
            ? "Xóa tất cả yêu thích?"
            : selectedCount === 1
              ? "Xóa 1 mục yêu thích?"
              : `Xóa ${selectedCount} mục yêu thích?`
        }
        body="Các mục đã chọn sẽ bị gỡ khỏi danh sách trên máy này. Đơn trên máy chủ không bị hủy."
        confirmLabel="Xóa"
        tone="danger"
        pending={deleting}
        onCancel={() => {
          if (!deleting) setConfirmDelete(false);
        }}
        onConfirm={() => {
          setDeleting(true);
          const ids = new Set(selectedIds);
          const wipeAll = ids.size === itemCount;
          void (wipeAll ? favorites.clearAll() : favorites.removeMany(ids))
            .then(() => {
              setConfirmDelete(false);
              exitEditMode();
            })
            .finally(() => setDeleting(false));
        }}
      />
    </View>
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
    temperatureGroup: item.temperatureGroup,
    temperatureLabel: item.temperatureLabel,
    vehicleRequirement: "",
    listedPriceVnd: item.listedPriceVnd,
    cargoImageIds: [],
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
  fill: { flex: 1 },
  list: { padding: space.lg, flexGrow: 1 },
  header: { gap: space.md, marginBottom: space.lg },
  kicker: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18, letterSpacing: 0.4 },
  displayTitle: { ...type.display },
  title: { ...type.screenTitle },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  titleFlex: { flex: 1, minWidth: 0 },
  editLink: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.xs },
  editLinkText: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  lede: { ...type.body },
  sectionMeta: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: space.xs },
  cardWrap: { flex: 1, minWidth: 0 },
  gap: { height: space.md },
  gapWide: { height: space.lg },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 56,
  },
  selectAll: { flexDirection: "row", alignItems: "center", gap: space.xs, minHeight: 44 },
  selectAllText: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  deleteBtn: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: space.md },
  deleteBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 22 },
});

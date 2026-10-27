import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { ConfirmDialog, EmptyState } from "../../components/common/Feedback";
import { PhoneFrame } from "../../components/common/PhoneFrame";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { SelectCircle } from "../../components/common/SelectCircle";
import { pointer } from "../../constants/hit";
import { space, type, useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import type { RootStackParamList } from "../../navigation/types";
import { ApiError } from "../../services/api/client";
import {
  deleteNotifications,
  listNotifications,
  markNotificationRead,
  type AppNotification,
} from "../../services/api/notifications";
import { formatWhen } from "../../utils/format";

export function NotificationsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session } = useAuth();
  const signedIn = session.status === "authenticated";
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!signedIn) {
      setItems([]);
      return;
    }
    try {
      setItems(await listNotifications());
      setError(null);
    } catch {
      setItems([]);
      setError("Không tải được thông báo.");
    }
  }, [signedIn]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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

  const itemCount = items?.length ?? 0;
  const selectedCount = selectedIds.size;
  const allSelected = itemCount > 0 && selectedCount === itemCount;

  const toggleSelectAll = useCallback(() => {
    if (!items) return;
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, [allSelected, items]);

  const listBottomPad = useMemo(() => (editMode && itemCount > 0 ? 72 : 0), [editMode, itemCount]);

  async function openNotice(item: AppNotification) {
    if (editMode) {
      toggleSelected(item.id);
      return;
    }
    setItems((current) => current?.map((row) => (row.id === item.id ? { ...row, read: true } : row)) ?? current);
    if (!item.read) {
      try {
        await markNotificationRead(item.id);
      } catch {
        void load();
      }
    }
    if (item.shipmentId) navigation.navigate("ShipmentDetail", { id: item.shipmentId });
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safe, { backgroundColor: colors.background }]}>
      <PhoneFrame style={styles.frame}>
        <View style={[styles.bar, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={8} onPress={() => navigation.goBack()} style={[styles.back, pointer]}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.ink} />
          </Pressable>
          <Text accessibilityRole="header" numberOfLines={1} style={[styles.barTitle, { color: colors.ink }]}>
            Thông báo{itemCount > 0 ? ` (${itemCount})` : ""}
          </Text>
          {signedIn && itemCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={editMode ? "Xong chỉnh sửa" : "Chỉnh sửa thông báo"}
              onPress={() => (editMode ? exitEditMode() : setEditMode(true))}
              style={[styles.editLink, pointer]}
            >
              <Text style={[styles.editLinkText, { color: colors.primary }]}>{editMode ? "Xong" : "Chỉnh sửa"}</Text>
            </Pressable>
          ) : (
            <View style={styles.editSpacer} />
          )}
        </View>
        {!signedIn ? (
          <View style={styles.guest}>
            <Text style={[styles.guestTitle, { color: colors.ink }]}>Đăng nhập để xem thông báo</Text>
            <Text style={[styles.guestBody, { color: colors.muted }]}>Thông báo đơn và sự cố hiện khi bạn đã vào tài khoản Coldi.</Text>
            <PrimaryButton spaced={false} label="Đăng nhập" onPress={() => navigation.navigate("Login")} />
          </View>
        ) : error && items?.length === 0 ? (
          <View style={styles.guest}>
            <Text accessibilityRole="alert" style={[styles.guestBody, { color: colors.danger }]}>
              {error}
            </Text>
            <PrimaryButton spaced={false} label="Thử lại" onPress={() => void load()} />
          </View>
        ) : items === null ? (
          <Text style={[styles.guestBody, { color: colors.muted, padding: space.xl }]}>Đang tải thông báo…</Text>
        ) : (
          <View style={styles.fill}>
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.list, { paddingBottom: listBottomPad + space.xxl }]}
              style={styles.fill}
              ListHeaderComponent={
                editMode
                  ? (
                      <Text maxFontSizeMultiplier={1.4} style={[styles.editHint, { color: colors.muted }]}>
                        Chọn thông báo cần xóa, rồi bấm Xóa ở thanh dưới.
                      </Text>
                    )
                  : undefined
              }
              ListEmptyComponent={<EmptyState title="Chưa có thông báo" body="Khi có đơn hoặc sự cố, thông báo hiện ở đây." />}
              renderItem={({ item }) => (
                <View style={styles.itemRow}>
                  {editMode ? (
                    <SelectCircle
                      selected={selectedIds.has(item.id)}
                      onPress={() => toggleSelected(item.id)}
                      label={`Chọn ${item.title}`}
                    />
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: !item.read }}
                    accessibilityLabel={`${item.title}. ${item.body}`}
                    onPress={() => void openNotice(item)}
                    style={[
                      styles.row,
                      pointer,
                      { borderBottomColor: colors.line, backgroundColor: item.read ? colors.surface : colors.badge },
                      editMode ? styles.rowEdit : null,
                    ]}
                  >
                    {!editMode ? <View style={[styles.dot, { backgroundColor: item.read ? "transparent" : colors.primary }]} /> : null}
                    <View style={styles.rowText}>
                      <Text style={[styles.rowLabel, { color: colors.ink }]}>{item.title}</Text>
                      {item.body ? <Text style={[styles.rowBody, { color: colors.muted }]}>{item.body}</Text> : null}
                      <Text style={[styles.rowTime, { color: colors.muted }]}>{formatWhen(item.createdAt)}</Text>
                    </View>
                    {!editMode ? <MaterialCommunityIcons name="chevron-right" size={22} color={colors.hint} /> : null}
                  </Pressable>
                </View>
              )}
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
                  accessibilityLabel="Xóa các thông báo đã chọn"
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
          </View>
        )}
        <ConfirmDialog
          visible={confirmDelete}
          title={
            selectedCount === itemCount
              ? "Xóa tất cả thông báo?"
              : selectedCount === 1
                ? "Xóa 1 thông báo?"
                : `Xóa ${selectedCount} thông báo?`
          }
          body="Thông báo đã chọn sẽ bị gỡ khỏi hộp thư trên máy chủ. Đơn trên hệ thống không bị hủy."
          confirmLabel="Xóa"
          tone="danger"
          pending={deleting}
          onCancel={() => {
            if (!deleting) setConfirmDelete(false);
          }}
          onConfirm={() => {
            setDeleting(true);
            const ids = [...selectedIds];
            void deleteNotifications(ids)
              .then(() => {
                setConfirmDelete(false);
                exitEditMode();
                return load();
              })
              .catch((caught) => {
                setError(caught instanceof ApiError ? caught.message : "Không xóa được thông báo.");
              })
              .finally(() => setDeleting(false));
          }}
        />
      </PhoneFrame>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  frame: { flex: 1 },
  bar: {
    minHeight: 56,
    paddingHorizontal: space.sm,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  barTitle: { ...type.screenTitle, flex: 1, textAlign: "center" },
  editLink: { minWidth: 88, minHeight: 44, alignItems: "flex-end", justifyContent: "center", paddingHorizontal: space.xs },
  editSpacer: { width: 88 },
  editLinkText: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  fill: { flex: 1 },
  list: { flexGrow: 1 },
  editHint: { ...type.body, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  itemRow: { flexDirection: "row", alignItems: "stretch" },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowEdit: { paddingLeft: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  rowBody: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  rowTime: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
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
  guest: { padding: space.lg, gap: space.md },
  guestTitle: { ...type.screenTitle },
  guestBody: { ...type.body },
});

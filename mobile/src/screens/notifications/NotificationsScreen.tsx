import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { PhoneFrame } from "../../components/common/PhoneFrame";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { pointer } from "../../constants/hit";
import { space, type, useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import type { RootStackParamList } from "../../navigation/types";
import { listNotifications, markNotificationRead, type AppNotification } from "../../services/api/notifications";
import { formatWhen } from "../../utils/format";

export function NotificationsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session } = useAuth();
  const signedIn = session.status === "authenticated";
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function openNotice(item: AppNotification) {
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
          <Text accessibilityRole="header" style={[styles.barTitle, { color: colors.ink }]}>
            Thông báo
          </Text>
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
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            style={styles.fill}
            ListEmptyComponent={<Text style={[styles.guestBody, { color: colors.muted, textAlign: "center", marginTop: space.xl }]}>Chưa có thông báo.</Text>}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: !item.read }}
                accessibilityLabel={`${item.title}. ${item.body}. Mở đơn`}
                onPress={() => void openNotice(item)}
                style={[styles.row, pointer, { borderBottomColor: colors.line, backgroundColor: item.read ? colors.surface : colors.badge }]}
              >
                <View style={[styles.dot, { backgroundColor: item.read ? "transparent" : colors.primary }]} />
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: colors.ink }]}>{item.title}</Text>
                  {item.body ? <Text style={[styles.rowBody, { color: colors.muted }]}>{item.body}</Text> : null}
                  <Text style={[styles.rowTime, { color: colors.muted }]}>{formatWhen(item.createdAt)}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.hint} />
              </Pressable>
            )}
          />
        )}
      </PhoneFrame>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  frame: { flex: 1 },
  bar: { minHeight: 56, paddingHorizontal: space.sm, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: space.xs },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  barTitle: { ...type.screenTitle },
  fill: { flex: 1 },
  list: { flexGrow: 1, paddingBottom: space.xxl },
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  rowBody: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  rowTime: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  guest: { padding: space.lg, gap: space.md },
  guestTitle: { ...type.screenTitle },
  guestBody: { ...type.body },
});

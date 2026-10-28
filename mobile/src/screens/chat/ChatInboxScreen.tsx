import { useCallback, useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "../../components/common/Feedback";
import { PhoneFrame } from "../../components/common/PhoneFrame";
import { pointer } from "../../constants/hit";
import { panelChrome, space, type, useTheme } from "../../constants/theme";
import { useChatInbox } from "../../features/chat/ChatInboxProvider";
import type { RootStackParamList } from "../../navigation/types";
import type { ChatInboxItem } from "../../services/api/chatInbox";
import { formatWhen } from "../../utils/format";

export function ChatInboxScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { unread, items, refresh } = useChatInbox();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const visible = useMemo(
    () => items.filter((row) => row.lastMessageId != null || row.unreadCount > 0),
    [items],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <PhoneFrame style={styles.frame}>
        <View style={[styles.top, { borderBottomColor: colors.line, backgroundColor: colors.surface }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => navigation.goBack()} style={[styles.back, pointer]}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.ink} />
          </Pressable>
          <View style={styles.titleWrap}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
              Hộp thư
            </Text>
            {unread > 0 ? (
              <Text style={[styles.unreadNote, { color: colors.muted }]}>{unread} tin chưa đọc</Text>
            ) : null}
          </View>
          <View style={styles.back} />
        </View>
        <FlatList
          data={visible}
          keyExtractor={(row) => row.conversationId}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title="Hộp thư trống" body="Tin nhắn chủ hàng sẽ hiện ở đây." />}
          renderItem={({ item }) => <InboxRow item={item} onOpen={() => navigation.navigate("ShipmentDetail", { id: item.shipmentId })} />}
        />
      </PhoneFrame>
    </View>
  );
}

function InboxRow({ item, onOpen }: { item: ChatInboxItem; onOpen: () => void }) {
  const { colors } = useTheme();
  const unread = item.unreadCount > 0;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      style={[
        styles.row,
        pointer,
        panelChrome(colors),
        unread ? { borderColor: colors.primary, borderWidth: 1.5 } : null,
      ]}
    >
      <View style={styles.rowHead}>
        <Text numberOfLines={2} style={[styles.rowTitle, { color: colors.ink }]}>
          {item.shipmentTitle}
        </Text>
        {unread ? (
          <View style={[styles.unread, { backgroundColor: colors.danger }]}>
            <Text style={styles.unreadText}>{item.unreadCount > 9 ? "9+" : item.unreadCount}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={[styles.route, { color: colors.muted }]}>
        {item.routeLabel}
      </Text>
      <Text numberOfLines={2} style={[styles.preview, { color: unread ? colors.ink : colors.muted }]}>
        {item.lastSenderRole === "SHIPPER" ? "Chủ hàng: " : item.lastSenderRole === "CARRIER" ? "Bạn: " : ""}
        {item.lastMessageBody}
      </Text>
      {item.lastMessageAt ? <Text style={[styles.time, { color: colors.hint }]}>{formatWhen(item.lastMessageAt)}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  frame: { flex: 1 },
  top: {
    minHeight: 56,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.sm,
  },
  back: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  titleWrap: { flex: 1, alignItems: "center", gap: 2 },
  title: { ...type.screenTitle, fontSize: 17 },
  unreadNote: { fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 16 },
  list: { padding: space.lg, paddingBottom: 96, flexGrow: 1, gap: space.md },
  row: { padding: space.lg, gap: space.xs, marginBottom: space.md },
  rowHead: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  rowTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 22 },
  unread: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  unreadText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 11, lineHeight: 14 },
  route: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  preview: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20 },
  time: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 16 },
});

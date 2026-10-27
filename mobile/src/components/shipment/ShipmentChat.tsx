import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DetailSectionShell } from "./DetailSectionShell";
import { pointer } from "../../constants/hit";
import { radius, space, useTheme } from "../../constants/theme";
import { ApiError } from "../../services/api/client";
import { loadChat, openChat, sendChat, type ChatMessage } from "../../services/api/operations";
import { formatWhen } from "../../utils/format";

export function ShipmentChat({ shipmentId, role }: { shipmentId: string; role: "SHIPPER" | "CARRIER" }) {
  const { colors } = useTheme();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const other = role === "SHIPPER" ? "Nhà xe" : "Chủ hàng";

  useEffect(() => {
    let cancel = false;
    void openChat(role, shipmentId)
      .then(async (id) => {
        if (cancel) return;
        setConversationId(id);
        setMessages(await loadChat(role, shipmentId, id));
      })
      .catch((caught) => {
        if (!cancel) setError(caught instanceof ApiError ? caught.message : "Không mở được chat.");
      });
    return () => {
      cancel = true;
    };
  }, [role, shipmentId]);

  async function send() {
    const text = draft.trim();
    if (!conversationId || text.length === 0 || pending) return;
    setPending(true);
    setError(null);
    try {
      await sendChat(role, shipmentId, conversationId, text);
      setDraft("");
      setMessages(await loadChat(role, shipmentId, conversationId));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không gửi được tin.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DetailSectionShell title={`Chat · ${other}`} subtitle="Trao đổi nhanh trên chuyến" icon="message-text-outline">
      <View style={[styles.frame, { backgroundColor: colors.field, borderColor: colors.line }]}>
        <ScrollView style={styles.thread} contentContainerStyle={styles.threadContent} keyboardShouldPersistTaps="handled">
          {messages.length === 0 ? <Text style={[styles.empty, { color: colors.muted }]}>Nhắn để bắt đầu.</Text> : null}
          {messages.map((message) => {
            const mine = message.senderRole === role;
            return (
              <View key={message.id} style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
                <View
                  style={[
                    styles.bubble,
                    mine ? styles.bubbleMine : styles.bubbleTheirs,
                    { backgroundColor: mine ? colors.primary : colors.surface },
                  ]}
                >
                  <Text style={[styles.body, { color: mine ? colors.onPrimary : colors.ink }]}>{message.body}</Text>
                  {message.createdAt ? (
                    <Text style={[styles.time, { color: mine ? colors.onPrimaryMuted : colors.hint }]}>{formatWhen(message.createdAt)}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </ScrollView>
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <View style={[styles.composer, { backgroundColor: colors.surface, borderTopColor: colors.line }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Nhắn tin"
            placeholderTextColor={colors.hint}
            accessibilityLabel="Nhắn tin"
            multiline
            onSubmitEditing={() => void send()}
            style={[styles.input, { color: colors.ink, backgroundColor: colors.field }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gửi"
            onPress={() => void send()}
            style={[styles.send, pointer, { backgroundColor: draft.trim() ? colors.primary : colors.line }]}
          >
            <MaterialCommunityIcons name="send" size={20} color={colors.onPrimary} />
          </Pressable>
        </View>
      </View>
    </DetailSectionShell>
  );
}

const styles = StyleSheet.create({
  frame: { height: 320, borderWidth: 1, borderRadius: radius.card, overflow: "hidden" },
  thread: { flex: 1 },
  threadContent: { padding: space.md, gap: space.sm, flexGrow: 1, justifyContent: "flex-end" },
  empty: { textAlign: "center", fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, marginVertical: space.lg },
  row: { flexDirection: "row", maxWidth: "100%" },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 6 },
  bubbleTheirs: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 6 },
  body: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 21 },
  time: { marginTop: 2, fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 14 },
  error: { paddingHorizontal: space.md, paddingBottom: space.xs, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, padding: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 40, maxHeight: 96, borderRadius: 20, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontFamily: "Inter_400Regular", fontSize: 15 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});

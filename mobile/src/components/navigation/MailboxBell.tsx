import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { pointer } from "../../constants/hit";
import { useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import { useChatInboxOptional } from "../../features/chat/ChatInboxProvider";
import type { RootStackParamList } from "../../navigation/types";

export function MailboxBell() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const inbox = useChatInboxOptional();
  const signedIn = session.status === "authenticated" && session.user.role === "CARRIER";

  useFocusEffect(
    useCallback(() => {
      if (signedIn && inbox) void inbox.refresh();
    }, [inbox, signedIn]),
  );

  if (!signedIn) return null;

  const unread = inbox?.unread ?? 0;
  const badge = unread > 9 ? "9+" : unread > 0 ? String(unread) : null;
  const label = badge ? `Hộp thư, ${unread} tin chưa đọc` : "Hộp thư";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => navigation.navigate("ChatInbox")}
      style={[styles.hit, pointer]}
    >
      <MaterialCommunityIcons name={unread > 0 ? "email" : "email-outline"} size={24} color={colors.ink} />
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <Text maxFontSizeMultiplier={1.1} style={styles.badgeText}>
            {badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 10, lineHeight: 12 },
});

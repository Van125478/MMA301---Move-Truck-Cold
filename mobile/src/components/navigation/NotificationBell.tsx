import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { pointer } from "../../constants/hit";
import { useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import type { RootStackParamList } from "../../navigation/types";
import { unreadNotificationCount } from "../../services/api/notifications";

export function NotificationBell() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const signedIn = session.status === "authenticated";
  const [unread, setUnread] = useState(0);

  const refreshCount = useCallback(async () => {
    if (!signedIn) {
      setUnread(0);
      return;
    }
    try {
      setUnread(await unreadNotificationCount());
    } catch {
      setUnread(0);
    }
  }, [signedIn]);

  useFocusEffect(
    useCallback(() => {
      void refreshCount();
    }, [refreshCount]),
  );

  const badge = unread > 9 ? "9+" : unread > 0 ? String(unread) : null;
  const label = badge ? `Thông báo, ${unread} chưa đọc` : "Thông báo";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => navigation.navigate("Notifications")}
      style={[styles.hit, pointer]}
    >
      <MaterialCommunityIcons name={unread > 0 ? "bell" : "bell-outline"} size={24} color={colors.ink} />
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

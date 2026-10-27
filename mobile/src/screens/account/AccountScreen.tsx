import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { panelChrome, space, useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import type { UserRole } from "../../types/auth";

const roleLabel: Record<UserRole, string> = {
  SHIPPER: "Chủ hàng",
  CARRIER: "Nhà xe",
  DRIVER: "Tài xế",
  ADMIN: "Quản trị",
};

const roleIcon: Record<UserRole, keyof typeof MaterialCommunityIcons.glyphMap> = {
  SHIPPER: "package-variant-closed",
  CARRIER: "truck-outline",
  DRIVER: "steering",
  ADMIN: "shield-account-outline",
};

export function AccountScreen() {
  const { colors } = useTheme();
  const { session, logout } = useAuth();
  const [leaving, setLeaving] = useState(false);
  if (session.status !== "authenticated") return null;
  const user = session.user;
  const name = user.email || user.username || "Tài khoản";

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={[styles.kicker, { color: colors.primary }]}>TÀI KHOẢN</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
        {roleLabel[user.role]}
      </Text>
      <View style={[styles.card, panelChrome(colors)]}>
        <View style={[styles.avatar, { backgroundColor: colors.badge }]}>
          <MaterialCommunityIcons name={roleIcon[user.role]} size={28} color={colors.badgeInk} />
        </View>
        <Text style={[styles.name, { color: colors.ink }]}>{name}</Text>
        <View style={[styles.badge, { backgroundColor: colors.badge }]}>
          <Text style={[styles.badgeText, { color: colors.badgeInk }]}>{roleLabel[user.role]}</Text>
        </View>
        <Text style={[styles.body, { color: colors.muted }]}>
          {user.role === "ADMIN"
            ? "Khu vận hành quản trị chưa mở trên app."
            : "Phiên đăng nhập được giữ trên máy. Đăng xuất xóa phiên, không xóa danh sách yêu thích của tài khoản này."}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đăng xuất"
        accessibilityState={{ busy: leaving, disabled: leaving }}
        disabled={leaving}
        onPress={() => {
          setLeaving(true);
          void logout().finally(() => setLeaving(false));
        }}
        style={[styles.logout, { borderColor: colors.line, backgroundColor: colors.surface, opacity: leaving ? 0.6 : 1 }]}
      >
        <Text style={[styles.logoutText, { color: colors.ink }]}>{leaving ? "Đang đăng xuất…" : "Đăng xuất"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, paddingBottom: 96, flexGrow: 1 },
  kicker: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18, letterSpacing: 1.1 },
  title: { marginTop: space.sm, fontFamily: "Inter_700Bold", fontSize: 28, lineHeight: 36 },
  card: { marginTop: space.lg, padding: space.xl, alignItems: "center", gap: space.sm },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  name: { marginTop: space.sm, fontFamily: "Inter_600SemiBold", fontSize: 18, lineHeight: 26, textAlign: "center" },
  badge: { marginTop: space.xs, borderRadius: 999, paddingHorizontal: space.md, paddingVertical: space.xs },
  badgeText: { fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 },
  body: { marginTop: space.md, fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 24, textAlign: "center" },
  logout: { minHeight: 52, marginTop: space.xxl, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  logoutText: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24 },
});

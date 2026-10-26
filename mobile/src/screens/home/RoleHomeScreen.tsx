import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wordmark } from "../../components/brand/Wordmark";
import { radius, space, type as textType, useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import type { UserRole } from "../../types/auth";

const roleCopy: Record<UserRole, { label: string; work: string }> = {
  SHIPPER: {
    label: "Chủ hàng",
    work: "Niêm yết đơn và theo dõi đơn của tài khoản.",
  },
  CARRIER: {
    label: "Nhà xe",
    work: "Xem đơn đang tìm xe, nhận chuyến và phân công đội xe.",
  },
  DRIVER: {
    label: "Tài xế",
    work: "Xem chuyến được nhà xe phân công, rồi xác nhận lấy hàng và giao hàng.",
  },
  ADMIN: {
    label: "Quản trị",
    work: "Khu vận hành quản trị chưa mở trên app.",
  },
};

export function RoleHomeScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { session, logout } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const gutter = width >= 768 ? space.xxl : space.lg;
  const cardWidth = Math.min(width - gutter * 2, 440);
  if (session.status !== "authenticated") return null;
  const user = session.user;
  const role = roleCopy[user.role];
  const name = user.email || user.username || "Tài khoản";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.page, { paddingHorizontal: gutter }]}>
        <Wordmark />
        <View style={[styles.card, { width: cardWidth, backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          <Text style={[styles.kicker, { color: colors.muted }]}>Đã đăng nhập</Text>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={[styles.title, { color: colors.ink }]}>
            {role.label}
          </Text>
          <Text style={[styles.name, { color: colors.ink }]}>{name}</Text>
          <Text style={[styles.roleCode, { color: colors.ink }]}>Máy chủ trả vai: {user.role}</Text>
          <Text style={[styles.work, { color: colors.muted }]}>{role.work}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đăng xuất"
            accessibilityState={{ disabled: leaving, busy: leaving }}
            disabled={leaving}
            onPress={() => {
              setLeaving(true);
              void logout().finally(() => setLeaving(false));
            }}
            style={({ pressed }) => [styles.logout, { borderColor: colors.line, backgroundColor: pressed ? colors.background : colors.surface, opacity: leaving ? 0.55 : 1 }]}
          >
            <Text style={[styles.logoutLabel, { color: colors.ink }]}>{leaving ? "Đang đăng xuất…" : "Đăng xuất"}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  page: { flex: 1, alignItems: "center", paddingVertical: space.xxl },
  card: {
    marginTop: space.xxl,
    borderRadius: radius.card,
    padding: space.xl,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 2,
  },
  kicker: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  title: { ...textType.display, marginTop: space.sm },
  name: { ...textType.body, marginTop: space.md },
  roleCode: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24, marginTop: space.sm },
  work: { ...textType.body, marginTop: space.sm },
  logout: {
    minHeight: 48,
    borderWidth: 2,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.xl,
  },
  logoutLabel: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24 },
});

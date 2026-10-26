import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandHeader } from "../../components/brand/Wordmark";
import { panelChrome, space, type as textType, useTheme } from "../../constants/theme";
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
        <View style={[styles.column, { width: cardWidth }]}>
          <BrandHeader />
          <View style={[styles.card, panelChrome(colors)]}>
            <Text style={[styles.kicker, { color: colors.primary }]}>Đã đăng nhập</Text>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={[styles.title, { color: colors.ink }]}>
              {role.label}
            </Text>
            <View style={[styles.badge, { backgroundColor: colors.badge }]}>
              <Text style={[styles.badgeText, { color: colors.badgeInk }]}>Máy chủ trả vai: {user.role}</Text>
            </View>
            <Text style={[styles.name, { color: colors.ink }]}>{name}</Text>
            <Text style={[styles.work, { color: colors.muted }]}>{role.work}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đăng xuất"
            accessibilityState={{ disabled: leaving, busy: leaving }}
            disabled={leaving}
            onPress={() => {
              setLeaving(true);
              void logout().finally(() => setLeaving(false));
            }}
            style={({ pressed }) => [
              styles.logout,
              {
                borderColor: colors.line,
                backgroundColor: pressed ? colors.field : colors.surface,
                opacity: leaving ? 0.55 : 1,
              },
            ]}
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
  page: { flex: 1, alignItems: "center", paddingTop: space.lg, paddingBottom: space.lg },
  column: { flex: 1 },
  card: { marginTop: space.xl, padding: space.xl },
  kicker: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18, letterSpacing: 0.6 },
  title: { ...textType.display, marginTop: space.sm },
  badge: { alignSelf: "flex-start", marginTop: space.lg, borderRadius: 999, paddingHorizontal: space.md, paddingVertical: space.sm },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  name: { ...textType.body, marginTop: space.lg },
  work: { ...textType.body, marginTop: space.sm },
  logout: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.xl,
  },
  logoutLabel: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24 },
});

import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/common/PrimaryButton";
import { space, type as textType, useTheme } from "../constants/theme";
import { useAuth } from "../features/auth/AuthProvider";

export function SessionGate() {
  const { colors } = useTheme();
  const { session, retry } = useAuth();
  const offline = session.status === "offline";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        {offline ? (
          <>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
              Không kết nối được máy chủ
            </Text>
            <Text style={[styles.body, { color: colors.muted }]}>Phiên đã lưu vẫn còn trên máy. Hãy kiểm tra API rồi thử lại.</Text>
            <PrimaryButton label="Thử lại" onPress={retry} />
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.body, { color: colors.muted }]}>Đang khôi phục phiên</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl },
  title: { ...textType.title, textAlign: "center" },
  body: { ...textType.body, textAlign: "center", marginTop: space.md },
});

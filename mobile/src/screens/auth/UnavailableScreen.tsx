import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wordmark } from "../../components/brand/Wordmark";
import { radius, space, type as textType, useTheme } from "../../constants/theme";
import type { RootStackParamList } from "../../navigation/types";

const copy = {
  register: {
    title: "Chưa có đăng ký trên máy chủ",
    body: "API hiện không có đường tạo tài khoản. Nhờ quản trị cấp tài khoản, rồi đăng nhập bằng email hoặc tên đăng nhập đã được cấp.",
  },
  forgot: {
    title: "Chưa có quên mật khẩu trên máy chủ",
    body: "API hiện không có đường đặt lại mật khẩu. Tài xế dùng mật khẩu tạm thì đăng nhập xong sẽ được yêu cầu đổi mật khẩu. Trường hợp khác, nhờ nhà xe hoặc quản trị cấp lại.",
  },
} as const;

export function UnavailableScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Unavailable">>();
  const topic = route.params?.topic === "forgot" ? "forgot" : "register";
  const page = copy[topic];
  const gutter = width >= 768 ? space.xxl : space.lg;
  const cardWidth = Math.min(width - gutter * 2, 440);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.page, { paddingHorizontal: gutter }]}>
        <Wordmark />
        <View style={[styles.card, { width: cardWidth, backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
            {page.title}
          </Text>
          <Text style={[styles.body, { color: colors.muted }]}>{page.body}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại đăng nhập"
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.back, { backgroundColor: pressed ? colors.primaryPressed : colors.primary }]}
          >
            <Text style={[styles.backLabel, { color: colors.onPrimary }]}>Quay lại đăng nhập</Text>
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
  title: { ...textType.title },
  body: { ...textType.body, marginTop: space.md },
  back: { minHeight: 48, borderRadius: radius.control, alignItems: "center", justifyContent: "center", marginTop: space.xl },
  backLabel: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24 },
});

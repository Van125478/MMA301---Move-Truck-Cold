import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandHeader } from "../../components/brand/Wordmark";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { panelChrome, space, type as textType, useTheme } from "../../constants/theme";
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
        <View style={{ width: cardWidth }}>
          <BrandHeader />
          <View style={[styles.card, panelChrome(colors)]}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
              {page.title}
            </Text>
            <Text style={[styles.body, { color: colors.muted }]}>{page.body}</Text>
            <PrimaryButton label="Quay lại đăng nhập" onPress={() => navigation.goBack()} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  page: { flex: 1, alignItems: "center", paddingTop: space.lg },
  card: { marginTop: space.xl, padding: space.xl },
  title: { ...textType.title },
  body: { ...textType.body, marginTop: space.md },
});

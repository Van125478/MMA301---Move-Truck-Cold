import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PhoneFrame } from "../../components/common/PhoneFrame";
import { ScreenTopBar } from "../../components/layout/ScreenTopBar";
import { GuestTabBar } from "../../components/navigation/GuestTabBar";
import { useTheme } from "../../constants/theme";
import type { RootStackParamList } from "../../navigation/types";
import { FavoritesScreen } from "../favorites/FavoritesScreen";

export function GuestSavedScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safe, { backgroundColor: colors.background }]}>
      <PhoneFrame style={styles.frame}>
        <View style={styles.shell}>
          <ScreenTopBar />
          <FavoritesScreen
            boardPromo
            promoArtIcon="heart"
            title="Yêu thích"
            lede="Lưu chuyến trên máy trước khi đăng nhập. Sau khi đăng nhập, danh sách theo tài khoản."
            onOpenDetail={() => navigation.navigate("Login")}
          />
        </View>
        <GuestTabBar active="saved" />
      </PhoneFrame>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  frame: { flex: 1 },
  shell: { flex: 1, minHeight: 0 },
});

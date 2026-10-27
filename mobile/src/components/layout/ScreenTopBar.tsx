import { StyleSheet, View } from "react-native";
import { Wordmark } from "../brand/Wordmark";
import { NotificationBell } from "../navigation/NotificationBell";
import { space, useTheme } from "../../constants/theme";

/** Thanh thương hiệu dùng chung Landing và workspace đã đăng nhập. */
export function ScreenTopBar() {
  const { colors } = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
      <Wordmark />
      <NotificationBell />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 56,
    paddingHorizontal: space.lg,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

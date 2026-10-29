import { StyleSheet, View, type ViewProps } from "react-native";

export function PhoneFrame({ children, style }: ViewProps) {
  return (
    <View style={[styles.frame, style]}>
      <View style={styles.column}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, width: "100%", alignItems: "center" },
  column: { flex: 1, width: "100%", maxWidth: 480, minHeight: 0, flexDirection: "column", alignSelf: "stretch" },
});

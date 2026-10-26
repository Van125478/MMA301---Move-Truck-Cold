import { Component, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type BoundaryProps = { children: ReactNode };
type BoundaryState = { failed: boolean };

export class AppErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.page}>
        <Text style={styles.title}>Màn hình gặp lỗi</Text>
        <Text style={styles.body}>Phần này dừng lại để cả app không bị đóng. Bạn có thể mở lại màn hình.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Mở lại" onPress={() => this.setState({ failed: false })} style={styles.button}>
          <Text style={styles.buttonLabel}>Mở lại</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#F8FAFC" },
  title: { fontSize: 20, lineHeight: 28, fontWeight: "600", color: "#1E293B", textAlign: "center" },
  body: { marginTop: 12, fontSize: 16, lineHeight: 24, color: "#475569", textAlign: "center" },
  button: { marginTop: 24, minHeight: 48, minWidth: 160, borderRadius: 12, backgroundColor: "#1E3A8A", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonLabel: { color: "#FFFFFF", fontSize: 16, lineHeight: 24, fontWeight: "600" },
});

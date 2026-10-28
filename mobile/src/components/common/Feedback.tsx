import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { pointer } from "../../constants/hit";
import { radius, space, useTheme } from "../../constants/theme";
import type { ShipmentStatus } from "../../types/shipment";

export function StatusPill({ status, label }: { status: ShipmentStatus; label: string }) {
  const { colors } = useTheme();
  const running = status === "MATCHED" || status === "PICKUP_CONFIRMED" || status === "IN_TRANSIT";
  const done = status === "DELIVERY_CONFIRMED" || status === "COMPLETED";
  const bad = status === "CANCELLED" || status === "INCIDENT";
  const background = running ? colors.successBg : done ? colors.badge : bad ? colors.dangerBg : colors.badge;
  const ink = running ? colors.success : done ? colors.badgeInk : bad ? colors.danger : colors.badgeInk;
  return (
    <View style={[styles.pill, { backgroundColor: background, maxWidth: "100%" }]}>
      <View style={[styles.dot, { backgroundColor: ink }]} />
      <Text maxFontSizeMultiplier={1.15} numberOfLines={1} ellipsizeMode="tail" style={[styles.pillText, { color: ink, flexShrink: 1 }]}>
        {label}
      </Text>
    </View>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[styles.centerText, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <Text accessibilityRole="header" style={[styles.emptyTitle, { color: colors.ink }]}>
        {title}
      </Text>
      <Text style={[styles.centerText, { color: colors.muted }]}>{body}</Text>
    </View>
  );
}

export function ErrorState({
  title = "Chưa tải được",
  message,
  actionLabel = "Thử lại",
  onRetry,
}: {
  title?: string;
  message: string;
  actionLabel?: string;
  onRetry: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="alert" style={styles.center}>
      <Text accessibilityRole="header" style={[styles.emptyTitle, { color: colors.ink }]}>{title}</Text>
      <Text style={[styles.centerText, { color: colors.danger }]}>{message}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onRetry} style={[styles.retry, pointer, { backgroundColor: colors.primary }]}>
        <Text style={[styles.retryText, { color: colors.onPrimary }]}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

export function SearchField({
  label,
  value,
  onChangeText,
  hideLabel = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  hideLabel?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.searchBlock}>
      {hideLabel ? null : (
        <Text style={[styles.searchLabel, { color: colors.ink }]}>{label}</Text>
      )}
      <View style={[styles.searchShell, { borderColor: colors.line, backgroundColor: colors.field }]}>
        <MaterialCommunityIcons name="magnify" size={22} color={colors.muted} accessibilityElementsHidden />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Mô tả hàng, điểm lấy, điểm giao"
          placeholderTextColor={colors.hint}
          accessibilityLabel={label}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, { color: colors.ink }]}
        />
      </View>
    </View>
  );
}

export function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      android_ripple={{ color: selected ? colors.onPrimaryMuted : colors.line, borderless: false }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        pointer,
        pressed ? styles.chipPressed : null,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.line,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? colors.onPrimary : colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

type ConfirmProps = {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ visible, title, body, confirmLabel, tone = "primary", pending = false, onConfirm, onCancel }: ConfirmProps) {
  const { colors } = useTheme();
  const confirmColor = tone === "danger" ? colors.danger : colors.primary;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View accessibilityViewIsModal style={[styles.dialog, { backgroundColor: colors.surface }]}>
          <Text accessibilityRole="header" style={[styles.dialogTitle, { color: colors.ink }]}>
            {title}
          </Text>
          <Text style={[styles.dialogBody, { color: colors.muted }]}>{body}</Text>
          <View style={styles.dialogRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              disabled={pending}
              onPress={onCancel}
              style={[styles.dialogButton, pointer, { borderColor: colors.line, backgroundColor: colors.surface }]}
            >
              <Text style={[styles.dialogButtonText, { color: colors.ink }]}>Đóng</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={pending ? "Đang xử lý" : confirmLabel}
              accessibilityState={{ busy: pending, disabled: pending }}
              disabled={pending}
              onPress={onConfirm}
              style={[styles.dialogButton, pointer, { borderColor: confirmColor, backgroundColor: confirmColor, opacity: pending ? 0.7 : 1 }]}
            >
              {pending ? <ActivityIndicator color={colors.onPrimary} /> : null}
              <Text style={[styles.dialogButtonText, { color: colors.onPrimary }]}>{pending ? "Đang xử lý…" : confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 16, letterSpacing: 0.3 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, gap: space.sm },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 30, textAlign: "center" },
  centerText: { fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 24, textAlign: "center" },
  retry: { minHeight: 48, marginTop: space.md, borderRadius: radius.control, paddingHorizontal: space.xl, alignItems: "center", justifyContent: "center" },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24 },
  searchBlock: { gap: space.sm },
  searchLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  searchShell: { minHeight: 52, borderWidth: 1, borderRadius: radius.control, flexDirection: "row", alignItems: "center", paddingHorizontal: space.md },
  searchInput: { flex: 1, minHeight: 48, marginLeft: space.sm, fontFamily: "Inter_400Regular", fontSize: 16 },
  chip: { minHeight: 44, borderWidth: 1, borderRadius: 999, paddingHorizontal: space.lg, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  chipPressed: { opacity: 0.82 },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.48)", justifyContent: "center", padding: space.xl },
  dialog: { borderRadius: radius.card, padding: space.xl, maxWidth: 440, width: "100%", alignSelf: "center" },
  dialogTitle: { fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 30 },
  dialogBody: { marginTop: space.sm, fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 24 },
  dialogRow: { marginTop: space.xl, flexDirection: "row", gap: space.md },
  dialogButton: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: radius.control, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: space.sm },
  dialogButtonText: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 22 },
});

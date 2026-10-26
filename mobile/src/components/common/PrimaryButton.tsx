import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { radius, space, useTheme } from "../../constants/theme";

type PrimaryButtonProps = {
  label: string;
  pendingLabel?: string;
  onPress: () => void;
  pending?: boolean;
  disabled?: boolean;
};

export function PrimaryButton({ label, pendingLabel, onPress, pending = false, disabled = false }: PrimaryButtonProps) {
  const { colors } = useTheme();
  const blocked = disabled || pending;
  const text = pending ? (pendingLabel ?? label) : label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ disabled: blocked, busy: pending }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed && !blocked ? colors.primaryPressed : colors.primary,
          opacity: disabled && !pending ? 0.55 : 1,
        },
      ]}
    >
      {pending ? <ActivityIndicator color={colors.onPrimary} /> : null}
      <Text style={[styles.label, { color: colors.onPrimary }]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.lg,
    marginTop: space.xl,
  },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24 },
});

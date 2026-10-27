import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { pointer } from "../../constants/hit";
import { space, useTheme } from "../../constants/theme";

export function SelectCircle({
  selected,
  onPress,
  label,
  inline = false,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
  inline?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={[inline ? styles.circleHitInline : styles.circleHit, pointer]}
    >
      {selected ? (
        <View style={[styles.circleOn, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          <MaterialCommunityIcons name="check" size={14} color={colors.onPrimary} />
        </View>
      ) : (
        <View style={[styles.circleOff, { borderColor: colors.muted }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circleHit: { marginTop: space.md, width: 40, height: 40, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  circleHitInline: { width: 40, height: 40, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  circleOff: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  circleOn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { space, useTheme } from "../../constants/theme";

export function FieldError({ message }: { message: string | null }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <View accessibilityLiveRegion="polite" style={styles.row}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={16}
        color={colors.danger}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text style={[styles.text, { color: colors.danger }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.sm, marginTop: space.sm },
  text: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
});

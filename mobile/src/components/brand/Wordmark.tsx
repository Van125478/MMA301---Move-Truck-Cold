import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { radius, useTheme } from "../../constants/theme";

export function Wordmark() {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Coldi Freight" style={styles.row}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.mark, { backgroundColor: colors.primary }]}
      >
        <MaterialCommunityIcons name="truck-outline" size={22} color={colors.onPrimary} />
      </View>
      <View>
        <Text style={[styles.name, { color: colors.ink }]}>Coldi</Text>
        <Text style={[styles.freight, { color: colors.muted }]}>FREIGHT</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  mark: { width: 48, height: 48, borderRadius: radius.mark, alignItems: "center", justifyContent: "center" },
  name: { fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 26 },
  freight: { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 16, letterSpacing: 1.2 },
});

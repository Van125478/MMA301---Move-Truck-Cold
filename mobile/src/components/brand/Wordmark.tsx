import { Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../constants/theme";

const logo = require("../../../assets/logo-coldi.png");
const logoOnBrand = require("../../../assets/logo-coldi-light.png");

export function Wordmark({ tone = "ink" }: { tone?: "ink" | "onPrimary" }) {
  const { colors } = useTheme();
  const onBrand = tone === "onPrimary";
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Coldi" style={styles.row}>
      <Image
        source={onBrand ? logoOnBrand : logo}
        resizeMode="contain"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.logo}
      />
      <Text style={[styles.name, { color: onBrand ? colors.onPrimary : colors.ink }]}>Coldi</Text>
    </View>
  );
}

export function BrandHeader() {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <Wordmark />
      <View style={[styles.rule, { backgroundColor: colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignSelf: "flex-start" },
  rule: { width: 56, height: 3, borderRadius: 2, marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 },
  logo: { width: 58, height: 35 },
  name: { fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 26 },
});

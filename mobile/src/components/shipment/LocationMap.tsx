import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { radius, space, useTheme } from "../../constants/theme";

export function LocationMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const { colors } = useTheme();
  const south = latitude - 0.02;
  const north = latitude + 0.02;
  const west = longitude - 0.02;
  const east = longitude + 0.02;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${west}%2C${south}%2C${east}%2C${north}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><iframe title="Bản đồ vị trí" src="${src}" style="border:0;width:100%;height:100%"></iframe></body></html>`;
  return (
    <View style={styles.wrap}>
      <WebView originWhitelist={["*"]} source={{ html }} style={styles.map} />
      <Text style={[styles.caption, { color: colors.muted }]}>
        {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  map: { height: 180, borderRadius: radius.card, overflow: "hidden" },
  caption: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
});

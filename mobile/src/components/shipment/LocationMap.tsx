import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { radius, space, useTheme } from "../../constants/theme";

const delta = 0.035;

export function LocationMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const { colors } = useTheme();
  const region = useMemo(
    () => ({
      latitude,
      longitude,
      latitudeDelta: delta,
      longitudeDelta: delta,
    }),
    [latitude, longitude],
  );

  return (
    <View style={styles.wrap}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={region}
        region={region}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        accessibilityLabel="Bản đồ vị trí xe"
      >
        <Marker coordinate={{ latitude, longitude }} title="Vị trí xe" />
      </MapView>
      <Text style={[styles.caption, { color: colors.muted }]}>{latitude.toFixed(5)}, {longitude.toFixed(5)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  map: { height: 200, borderRadius: radius.card, overflow: "hidden" },
  caption: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
});

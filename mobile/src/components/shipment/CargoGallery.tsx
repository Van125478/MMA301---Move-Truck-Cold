import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { radius, space, useTheme } from "../../constants/theme";
import { cargoImageSource } from "../../services/api/shipments";

type Source = { uri: string; headers?: Record<string, string> };

function Photo({ id, index, onFail, failed }: { id: string; index: number; onFail: () => void; failed: boolean }) {
  const { colors } = useTheme();
  const [source, setSource] = useState<Source | null>(null);
  useEffect(() => {
    let alive = true;
    void cargoImageSource(id).then((next) => {
      if (alive) setSource(next);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return (
    <View style={[styles.frame, { backgroundColor: colors.badge, borderColor: colors.line }]}>
      {source && !failed ? (
        <Image
          source={source}
          accessibilityLabel={`Ảnh hàng hóa ${index + 1}`}
          resizeMode="cover"
          style={styles.photo}
          onError={onFail}
        />
      ) : (
        <Text style={[styles.fallback, { color: colors.muted }]}>{failed ? "Không tải được ảnh" : "Đang tải ảnh"}</Text>
      )}
    </View>
  );
}

export function CargoGallery({ ids }: { ids: readonly string[] }) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  if (ids.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {ids.map((id, index) => (
        <Photo key={id} id={id} index={index} failed={failed.has(id)} onFail={() => setFailed((current) => new Set(current).add(id))} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm },
  frame: { width: 160, height: 120, borderRadius: radius.card, borderWidth: 1, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  photo: { width: "100%", height: "100%" },
  fallback: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18, textAlign: "center", paddingHorizontal: space.sm },
});

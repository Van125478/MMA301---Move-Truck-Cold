import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { radius, space, useTheme } from "../../constants/theme";
import type { PickedCargoImage } from "../../features/shipments/useCreateShipmentForm";

export function CargoImagePicker({
  images,
  max,
  onPick,
  onRemove,
  error,
}: {
  images: PickedCargoImage[];
  max: number;
  onPick: () => void;
  onRemove: (localUri: string) => void;
  error: string | null;
}) {
  const { colors } = useTheme();

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {images.map((image) => (
          <View key={image.localUri} style={[styles.thumbWrap, { borderColor: image.error ? colors.danger : colors.line }]}>
            <Image source={{ uri: image.localUri }} style={styles.thumb} accessibilityLabel="Ảnh hàng hóa đã chọn" />
            {image.uploading ? (
              <View style={[styles.overlay, { backgroundColor: `${colors.ink}99` }]}>
                <ActivityIndicator color={colors.onPrimary} />
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa ảnh"
              onPress={() => onRemove(image.localUri)}
              style={[styles.removeBtn, { backgroundColor: colors.danger }]}
            >
              <MaterialCommunityIcons name="close" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        ))}
        {images.length < max ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thêm ảnh hàng hóa"
            onPress={onPick}
            style={[styles.addBtn, { borderColor: colors.line, backgroundColor: colors.field }]}
          >
            <MaterialCommunityIcons name="camera-plus-outline" size={26} color={colors.muted} />
            <Text style={[styles.addLabel, { color: colors.muted }]}>Thêm ảnh</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      {images.some((image) => image.error) ? (
        <Text style={[styles.imageError, { color: colors.danger }]}>
          {images.find((image) => image.error)?.error}
        </Text>
      ) : null}
      {error ? <Text style={[styles.imageError, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingVertical: space.xs },
  thumbWrap: { width: 88, height: 88, borderRadius: radius.control, borderWidth: 1, overflow: "hidden" },
  thumb: { width: "100%", height: "100%" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: { width: 88, height: 88, borderRadius: radius.control, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4 },
  addLabel: { fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 16 },
  imageError: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, marginTop: space.sm },
});

import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { uploadCargoImage } from "../../services/api/shipments";

export const CARGO_IMAGE_MIN = 1;
export const CARGO_IMAGE_MAX = 5;

export type PickedCargoImage = { localUri: string; id: string | null; uploading: boolean; error: string | null };

const MIME_BY_EXT: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

function guessMimeType(uri: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(uri.split("?")[0] ?? "");
  const ext = match?.[1]?.toLowerCase();
  return (ext ? MIME_BY_EXT[ext] : undefined) ?? "image/jpeg";
}

export function useCargoImages() {
  const [images, setImages] = useState<PickedCargoImage[]>([]);

  const pickImage = useCallback(async (): Promise<string | null> => {
    if (images.length >= CARGO_IMAGE_MAX) return `Chỉ thêm tối đa ${CARGO_IMAGE_MAX} ảnh hàng hóa.`;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return "Coldi cần quyền truy cập ảnh để đính kèm ảnh hàng hóa.";
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      selectionLimit: CARGO_IMAGE_MAX - images.length,
      allowsMultipleSelection: true,
    });
    if (result.canceled) return null;
    const picked = result.assets.slice(0, CARGO_IMAGE_MAX - images.length);
    setImages((previous) => [...previous, ...picked.map((asset) => ({ localUri: asset.uri, id: null, uploading: true, error: null }))]);
    await Promise.all(
      picked.map(async (asset) => {
        const localUri = asset.uri;
        try {
          const bytes = await (await fetch(localUri)).arrayBuffer();
          if (bytes.byteLength > 2_000_000) throw new Error("too_large");
          const id = await uploadCargoImage(bytes, asset.mimeType ?? guessMimeType(localUri));
          setImages((previous) => previous.map((item) => (item.localUri === localUri ? { ...item, id, uploading: false } : item)));
        } catch (error) {
          const message = error instanceof Error && error.message === "too_large" ? "Ảnh vượt quá 2 MB." : "Không tải được ảnh. Hãy thử lại.";
          setImages((previous) => previous.map((item) => (item.localUri === localUri ? { ...item, uploading: false, error: message } : item)));
        }
      }),
    );
    return null;
  }, [images.length]);

  const removeImage = useCallback((localUri: string) => {
    setImages((previous) => previous.filter((item) => item.localUri !== localUri));
  }, []);

  const reset = useCallback(() => setImages([]), []);

  const ids = images.flatMap((item) => (item.id ? [item.id] : []));
  const uploading = images.some((item) => item.uploading);
  return { images, ids, uploading, pickImage, removeImage, reset };
}

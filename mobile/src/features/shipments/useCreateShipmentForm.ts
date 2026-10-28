import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { createShipment, uploadCargoImage } from "../../services/api/shipments";
import {
  CARGO_IMAGE_MAX,
  emptyShipmentDraft,
  isDraftValid,
  toPublishPayload,
  validateShipmentDraft,
  type NewShipmentDraft,
  type ShipmentDraftFieldErrors,
} from "./shipmentDraftValidation";
import { ApiError } from "../../services/api/client";
import { classifyApiError } from "../../utils/apiErrorClassifier";
import type { Shipment } from "../../types/shipment";

export type PickedCargoImage = { localUri: string; id: string | null; uploading: boolean; error: string | null };

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function guessMimeType(uri: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(uri.split("?")[0] ?? "");
  const ext = match?.[1]?.toLowerCase();
  return (ext ? MIME_BY_EXT[ext] : undefined) ?? "image/jpeg";
}

export function useCreateShipmentForm() {
  const [draft, setDraft] = useState<NewShipmentDraft>(emptyShipmentDraft);
  const [touched, setTouched] = useState<Partial<Record<keyof NewShipmentDraft, true>>>({});
  const [images, setImages] = useState<PickedCargoImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const errors: ShipmentDraftFieldErrors = validateShipmentDraft(draft);

  const setField = useCallback(<K extends keyof NewShipmentDraft>(key: K, value: NewShipmentDraft[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setServerErrors((previous) => {
      if (!(key in previous)) return previous;
      const { [key]: _removed, ...rest } = previous;
      return rest;
    });
    setTouched((previous) => ({ ...previous, [key]: true }));
  }, []);

  const markTouched = useCallback((key: keyof NewShipmentDraft) => {
    setTouched((previous) => ({ ...previous, [key]: true }));
  }, []);

  const visibleError = useCallback(
    (key: keyof NewShipmentDraft): string | null => (touched[key] ? errors[key] ?? serverErrors[key] ?? null : serverErrors[key] ?? null),
    [errors, touched, serverErrors],
  );

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
    const entries: PickedCargoImage[] = picked.map((asset) => ({ localUri: asset.uri, id: null, uploading: true, error: null }));
    setImages((previous) => [...previous, ...entries]);

    await Promise.all(
      picked.map(async (asset, index) => {
        const localUri = entries[index]?.localUri;
        if (!localUri) return;
        try {
          const response = await fetch(asset.uri);
          const bytes = await response.arrayBuffer();
          if (bytes.byteLength > 2_000_000) throw new Error("too_large");
          const contentType = asset.mimeType ?? guessMimeType(asset.uri);
          const id = await uploadCargoImage(bytes, contentType);
          setImages((previous) => previous.map((item) => (item.localUri === localUri ? { ...item, id, uploading: false } : item)));
          setDraft((previous) => ({ ...previous, cargoImageIds: [...previous.cargoImageIds, id] }));
          setTouched((previous) => ({ ...previous, cargoImageIds: true }));
        } catch (error) {
          const message =
            error instanceof Error && error.message === "too_large"
              ? "Ảnh vượt quá 2 MB."
              : classifyApiError(error).message;
          setImages((previous) => previous.map((item) => (item.localUri === localUri ? { ...item, uploading: false, error: message } : item)));
        }
      }),
    );
    return null;
  }, [images.length]);

  const removeImage = useCallback((localUri: string) => {
    setImages((previous) => {
      const target = previous.find((item) => item.localUri === localUri);
      if (target?.id) {
        setDraft((draftPrevious) => ({ ...draftPrevious, cargoImageIds: draftPrevious.cargoImageIds.filter((id) => id !== target.id) }));
      }
      return previous.filter((item) => item.localUri !== localUri);
    });
    setTouched((previous) => ({ ...previous, cargoImageIds: true }));
  }, []);

  const submit = useCallback(async (): Promise<Shipment | null> => {
    setTouched(
      Object.keys(emptyShipmentDraft).reduce((acc, key) => ({ ...acc, [key]: true }), {} as Partial<Record<keyof NewShipmentDraft, true>>),
    );
    if (submitting) return null;
    if (!isDraftValid(draft)) return null;
    if (images.some((image) => image.uploading)) {
      setSubmitError("Còn ảnh đang tải lên. Hãy đợi xong rồi đăng đơn.");
      return null;
    }
    setSubmitting(true);
    setSubmitError(null);
    setServerErrors({});
    try {
      const shipment = await createShipment(toPublishPayload(draft));
      return shipment;
    } catch (error) {
      if (error instanceof ApiError && error.fields) setServerErrors({ ...error.fields });
      setSubmitError(
        error instanceof ApiError && error.status === 400 ? error.message : classifyApiError(error).message,
      );
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [draft, images, submitting]);

  return {
    draft,
    setField,
    markTouched,
    errors,
    visibleError,
    isValid: isDraftValid(draft),
    images,
    pickImage,
    removeImage,
    submit,
    submitting,
    submitError,
  };
}

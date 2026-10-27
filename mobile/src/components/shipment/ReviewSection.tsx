import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Field } from "../common/Field";
import { FieldError } from "../common/FieldError";
import { PrimaryButton } from "../common/PrimaryButton";
import { DetailSectionShell } from "./DetailSectionShell";
import { pointer } from "../../constants/hit";
import { radius, space, useTheme } from "../../constants/theme";
import { ApiError } from "../../services/api/client";
import { loadReviews, submitReview, type ReviewBundle } from "../../services/api/shipments";
import { formatWhen } from "../../utils/format";

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel={`${value} sao`} style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialCommunityIcons key={star} name={star <= value ? "star" : "star-outline"} size={size} color={star <= value ? "#B45309" : colors.hint} />
      ))}
    </View>
  );
}

export function ReviewSection({ shipmentId, canWrite }: { shipmentId: string; canWrite: boolean }) {
  const { colors } = useTheme();
  const [bundle, setBundle] = useState<ReviewBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBundle(await loadReviews(shipmentId));
      setError(null);
    } catch (caught) {
      setBundle({ reviews: [], total: 0, groups: [] });
      setError(caught instanceof ApiError ? caught.message : "Không tải được đánh giá.");
    }
  }, [shipmentId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function send() {
    const text = comment.trim();
    if (text.length === 0) {
      setFormError("Cần nhập nhận xét.");
      return;
    }
    setPending(true);
    setFormError(null);
    try {
      await submitReview(shipmentId, stars, text);
      setComment("");
      await load();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : "Không gửi được đánh giá.");
    } finally {
      setPending(false);
    }
  }

  const total = bundle?.total ?? 0;
  const showForm = canWrite && total === 0 && !error;

  return (
    <DetailSectionShell title="Đánh giá" subtitle="Chủ hàng chấm nhà xe sau khi giao" icon="star-circle-outline" accent="#B45309">
      {error ? <FieldError message={error} /> : null}
      <Text style={[styles.meta, { color: colors.muted }]}>{total === 0 ? "Chưa có đánh giá." : `${total} đánh giá`}</Text>
      {bundle && bundle.groups.length > 0 ? (
        <View style={styles.groups}>
          {bundle.groups.map((group) => (
            <View key={group.stars} style={[styles.group, { backgroundColor: colors.badge }]}>
              <Stars value={group.stars} />
              <Text style={[styles.groupCount, { color: colors.badgeInk }]}>{group.count}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {bundle?.reviews.map((review) => (
        <View key={review.id} style={[styles.card, { borderColor: colors.line, backgroundColor: colors.surface }]}>
          <Stars value={review.stars} />
          <Text style={[styles.comment, { color: colors.ink }]}>{review.comment}</Text>
          <Text style={[styles.meta, { color: colors.muted }]}>{formatWhen(review.createdAt)}</Text>
        </View>
      ))}
      {showForm ? (
        <View style={styles.form}>
          <Text style={[styles.meta, { color: colors.ink }]}>Chấm sao cho nhà xe</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} accessibilityRole="button" accessibilityLabel={`${star} sao`} accessibilityState={{ selected: stars === star }} onPress={() => setStars(star)} style={pointer}>
                <MaterialCommunityIcons name={star <= stars ? "star" : "star-outline"} size={28} color={star <= stars ? "#B45309" : colors.hint} />
              </Pressable>
            ))}
          </View>
          <Field label="Nhận xét" value={comment} onChangeText={setComment} error={formError} multiline maxLength={500} />
          <PrimaryButton spaced={false} label="Gửi đánh giá" pending={pending} pendingLabel="Đang gửi…" onPress={() => void send()} />
        </View>
      ) : null}
    </DetailSectionShell>
  );
}

const styles = StyleSheet.create({
  meta: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  groups: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  group: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  groupCount: { fontFamily: "Inter_700Bold", fontSize: 13, lineHeight: 18 },
  stars: { flexDirection: "row", alignItems: "center", gap: 2 },
  card: { borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.xs },
  comment: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22 },
  form: { gap: space.sm, marginTop: space.sm },
});

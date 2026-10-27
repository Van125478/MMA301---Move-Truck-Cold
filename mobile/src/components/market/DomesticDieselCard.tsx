import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { radius, space, useTheme } from "../../constants/theme";
import { apiRequest } from "../../services/api/client";

type DieselPrice = {
  available: boolean;
  productLabel: string;
  priceVndPerLitre: number | null;
  priceKindLabel: string | null;
  documentNumber: string | null;
  announcedOn: string | null;
  message: string | null;
  disclaimer: string;
};

export function DomesticDieselCard() {
  const { colors } = useTheme();
  const [diesel, setDiesel] = useState<DieselPrice | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await apiRequest<{ diesel?: unknown }>("/api/market/fuel");
      const row = result.data.diesel;
      if (typeof row !== "object" || row === null) return;
      const record = row as Record<string, unknown>;
      setDiesel({
        available: record.available === true,
        productLabel: typeof record.productLabel === "string" ? record.productLabel : "Dầu diesel 0.05S",
        priceVndPerLitre: typeof record.priceVndPerLitre === "number" ? record.priceVndPerLitre : null,
        priceKindLabel: typeof record.priceKindLabel === "string" ? record.priceKindLabel : null,
        documentNumber: typeof record.documentNumber === "string" ? record.documentNumber : null,
        announcedOn: typeof record.announcedOn === "string" ? record.announcedOn : null,
        message: typeof record.message === "string" ? record.message : null,
        disclaimer: typeof record.disclaimer === "string" ? record.disclaimer : "Giá diesel trong nước đã xác minh. Không phải giá dầu thô nước ngoài và không đổi cước.",
      });
    } catch {
      setDiesel(null);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!diesel) return null;
  const price = diesel.available && diesel.priceVndPerLitre != null
    ? `${new Intl.NumberFormat("vi-VN").format(diesel.priceVndPerLitre)} đ/lít`
    : diesel.message ?? "Chưa có dữ liệu diesel được xác minh";

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Text style={[styles.kicker, { color: colors.primary }]}>Giá dầu trong nước</Text>
      <Text style={[styles.title, { color: colors.ink }]}>{diesel.productLabel}</Text>
      <Text style={[styles.price, { color: colors.ink }]}>{price}</Text>
      {diesel.priceKindLabel ? <Text style={[styles.meta, { color: colors.muted }]}>{diesel.priceKindLabel}</Text> : null}
      {diesel.documentNumber ? <Text style={[styles.meta, { color: colors.muted }]}>Văn bản {diesel.documentNumber}{diesel.announcedOn ? ` · ${diesel.announcedOn}` : ""}</Text> : null}
      <Text style={[styles.meta, { color: colors.hint }]}>{diesel.disclaimer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card, padding: space.lg, gap: 4 },
  kicker: { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 16, letterSpacing: 0.3 },
  title: { fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 22 },
  price: { fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 30 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
});

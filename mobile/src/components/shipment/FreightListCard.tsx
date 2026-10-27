import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { pointer } from "../../constants/hit";
import { elevatedCard, radius, space, type, useTheme } from "../../constants/theme";
import { formatVnd } from "../../utils/format";
import { StatusPill } from "../common/Feedback";
import type { ShipmentStatus } from "../../types/shipment";

export type FreightCardModel = {
  displayCode?: string;
  status: ShipmentStatus;
  statusLabel: string;
  cargoDescription: string;
  pickupLocation: string;
  deliveryLocation: string;
  pickupAt: string | null;
  vehicleLine: string | null;
  listedPriceVnd: number;
  imageSource?: ImageSourcePropType;
  imageLabel?: string;
};

type Props = {
  model: FreightCardModel;
  variant?: "showcase" | "list";
  saved?: boolean;
  onPress: () => void;
  onToggleFavorite?: () => void;
};

export function FreightListCard({ model, variant = "list", saved, onPress, onToggleFavorite }: Props) {
  const { colors } = useTheme();
  const routeLine = `${model.pickupLocation} → ${model.deliveryLocation}`;
  const heroHeight = variant === "showcase" ? 180 : 128;
  const showHero = Boolean(model.imageSource);
  const a11y = `${model.cargoDescription}. ${routeLine}. Giờ bốc ${model.pickupAt ?? "chưa có"}. Giá ${formatVnd(model.listedPriceVnd)}.`;

  return (
    <View style={[elevatedCard(colors), styles.shell, showHero ? styles.shellPhoto : null]}>
      {showHero && model.imageSource ? (
        <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} style={[styles.heroWrap, pointer]}>
          <Image
            source={model.imageSource}
            accessibilityLabel={model.imageLabel}
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            fadeDuration={0}
            style={[styles.heroImage, { height: heroHeight }]}
          />
        </Pressable>
      ) : null}

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            {model.displayCode ? (
              <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[styles.code, { color: colors.muted }]}>
                {model.displayCode}
              </Text>
            ) : null}
            <View style={styles.pillWrap}>
              <StatusPill status={model.status} label={model.statusLabel} />
            </View>
          </View>
          {onToggleFavorite ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={saved ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
              accessibilityState={{ selected: saved }}
              hitSlop={8}
              onPress={onToggleFavorite}
              style={[styles.heart, pointer]}
            >
              <MaterialCommunityIcons name={saved ? "heart" : "heart-outline"} size={22} color={saved ? colors.danger : colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} style={({ pressed }) => [pressed ? styles.pressed : null, pointer]}>
          <Text maxFontSizeMultiplier={1.35} numberOfLines={2} ellipsizeMode="tail" style={[styles.cargoTitle, { color: colors.ink }]}>
            {model.cargoDescription}
          </Text>

          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} ellipsizeMode="tail" style={[styles.route, { color: colors.ink }]}>
            {routeLine}
          </Text>

          {model.vehicleLine ? (
            <View style={[styles.chip, { backgroundColor: colors.badge }]}>
              <Text maxFontSizeMultiplier={1.25} numberOfLines={1} ellipsizeMode="tail" style={[styles.chipText, { color: colors.badgeInk }]}>
                {model.vehicleLine}
              </Text>
            </View>
          ) : null}

          <View style={[styles.footer, { borderTopColor: colors.line }]}>
            <View style={styles.footerTime}>
              <Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={[styles.footerLabel, { color: colors.hint }]}>
                GIỜ BỐC HÀNG
              </Text>
              <Text maxFontSizeMultiplier={1.35} numberOfLines={2} style={[styles.footerTimeValue, { color: colors.ink }]}>
                {model.pickupAt ?? "—"}
              </Text>
            </View>
            <View style={[styles.footerPrice, { borderLeftColor: colors.line }]}>
              <Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={[styles.footerLabel, { color: colors.hint }]}>
                GIÁ CƯỚC
              </Text>
              <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.price, { color: colors.primary }]}>
                {formatVnd(model.listedPriceVnd)}
              </Text>
            </View>
          </View>

          {variant === "showcase" ? (
            <View style={[styles.ctaRow, { borderTopColor: colors.line }]}>
              <View style={[styles.ctaButton, { backgroundColor: colors.primary }]}>
                <Text maxFontSizeMultiplier={1.15} style={[styles.ctaButtonText, { color: colors.onPrimary }]}>
                  Xem đơn
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.onPrimary} />
              </View>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { width: "100%" },
  shellPhoto: { overflow: "hidden", padding: 0 },
  heroWrap: { width: "100%", alignSelf: "stretch" },
  heroImage: { width: "100%", borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  body: { padding: space.lg, gap: space.sm },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  metaLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm, minWidth: 0 },
  code: { flexShrink: 0, fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  pillWrap: { flex: 1, minWidth: 0, alignItems: "flex-start" },
  heart: { width: 44, height: 44, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  pressed: { opacity: 0.94 },
  cargoTitle: { marginTop: space.xs, fontFamily: "Inter_700Bold", fontSize: 17, lineHeight: 24 },
  route: { marginTop: space.xs, fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  chip: { alignSelf: "flex-start", maxWidth: "100%", marginTop: space.sm, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 16 },
  footer: {
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "stretch",
  },
  footerTime: { flex: 1.25, paddingRight: space.md, gap: 4, minWidth: 0 },
  footerPrice: {
    flex: 0.75,
    paddingLeft: space.md,
    borderLeftWidth: StyleSheet.hairlineWidth,
    gap: 4,
    minWidth: 0,
    alignItems: "flex-end",
  },
  footerLabel: { fontFamily: "Inter_600SemiBold", fontSize: 10, lineHeight: 13, letterSpacing: 0.5 },
  footerTimeValue: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  price: { ...type.price, fontSize: 17, lineHeight: 22, textAlign: "right", maxWidth: "100%" },
  ctaRow: {
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "stretch",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.control,
  },
  ctaButtonText: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
});

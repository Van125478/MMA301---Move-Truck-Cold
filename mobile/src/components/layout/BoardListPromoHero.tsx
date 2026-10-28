import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { pointer } from "../../constants/hit";
import { elevatedCard, space, useTheme } from "../../constants/theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type Props = {
  title: string;
  subline: string;
  query: string;
  onChangeQuery: (value: string) => void;
  searchPlaceholder?: string;
  onFavoritesPress?: () => void;
  artIcon?: IconName;
};

/** Banner + thanh tìm nổi (danh sách chính theo vai trò). Không thay ScreenTopBar. */
export function BoardListPromoHero({
  title,
  subline,
  query,
  onChangeQuery,
  searchPlaceholder = "Mô tả hàng, điểm lấy, điểm giao",
  onFavoritesPress,
  artIcon = "truck-fast-outline",
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.root}>
      <View style={[styles.banner, { backgroundColor: colors.brand }]}>
        <View style={styles.bannerCopy}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[styles.headline, { color: colors.onPrimary }]}>
            {title}
          </Text>
          <Text maxFontSizeMultiplier={1.4} style={[styles.subline, { color: colors.onPrimaryMuted }]}>
            {subline}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={artIcon}
          size={80}
          color={colors.onPrimary}
          style={styles.art}
          accessibilityElementsHidden
        />
      </View>

      <View style={styles.toolbar}>
        <View style={[styles.searchPill, elevatedCard(colors), { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <MaterialCommunityIcons name="magnify" size={22} color={colors.muted} accessibilityElementsHidden />
          <TextInput
            value={query}
            onChangeText={onChangeQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.hint}
            accessibilityLabel={searchPlaceholder}
            returnKeyType="search"
            style={[styles.input, { color: colors.ink }]}
          />
          {onFavoritesPress ? (
            <>
              <View style={[styles.divider, { backgroundColor: colors.line }]} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Yêu thích"
                onPress={onFavoritesPress}
                hitSlop={6}
                style={[styles.heart, pointer]}
              >
                <MaterialCommunityIcons name="heart-outline" size={22} color={colors.primary} />
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginHorizontal: -space.lg, marginBottom: space.sm },
  banner: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.xxl + space.md,
    overflow: "hidden",
    minHeight: 120,
  },
  bannerCopy: { maxWidth: "72%", gap: space.sm },
  headline: { fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 30 },
  subline: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 21 },
  art: { position: "absolute", right: space.md, bottom: space.sm, opacity: 0.32 },
  toolbar: {
    marginTop: -space.xl,
    paddingHorizontal: space.lg,
  },
  searchPill: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: space.md,
    paddingRight: space.xs,
    gap: space.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 0,
  },
  divider: { width: 1, height: 24 },
  heart: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
});

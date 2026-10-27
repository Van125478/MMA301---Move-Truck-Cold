import { Platform, StyleSheet, useColorScheme, type ViewStyle } from "react-native";

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  control: 12,
  card: 16,
  mark: 14,
  pill: 999,
} as const;

export type Palette = {
  background: string;
  surface: string;
  field: string;
  ink: string;
  muted: string;
  hint: string;
  line: string;
  brand: string;
  primary: string;
  onPrimary: string;
  onPrimaryMuted: string;
  primaryPressed: string;
  badge: string;
  badgeInk: string;
  danger: string;
  dangerBg: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  focus: string;
  shadow: string;
  routeFrom: string;
  routeTo: string;
};

/** Coldi mobile — navy B2B logistics, không gradient AI. */
const light: Palette = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  field: "#F1F5F9",
  ink: "#0F172A",
  muted: "#64748B",
  hint: "#94A3B8",
  line: "#E2E8F0",
  brand: "#1D428A",
  primary: "#1D428A",
  onPrimary: "#FFFFFF",
  onPrimaryMuted: "#DBEAFE",
  primaryPressed: "#153266",
  badge: "#EEF3FF",
  badgeInk: "#1D428A",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  success: "#15803D",
  successBg: "#DCFCE7",
  warning: "#B45309",
  warningBg: "#FFEDD5",
  focus: "#1D428A",
  shadow: "#0F172A",
  routeFrom: "#22C55E",
  routeTo: "#EF4444",
};

const dark: Palette = {
  background: "#0B1220",
  surface: "#111827",
  field: "#0F172A",
  ink: "#F8FAFC",
  muted: "#CBD5E1",
  hint: "#94A3B8",
  line: "#334155",
  brand: "#1D428A",
  primary: "#3B82F6",
  onPrimary: "#FFFFFF",
  onPrimaryMuted: "#DBEAFE",
  primaryPressed: "#2563EB",
  badge: "#1E3A5F",
  badgeInk: "#DBEAFE",
  danger: "#FCA5A5",
  dangerBg: "#450A0A",
  success: "#86EFAC",
  successBg: "#052E16",
  warning: "#FDBA74",
  warningBg: "#431407",
  focus: "#93C5FD",
  shadow: "#000000",
  routeFrom: "#4ADE80",
  routeTo: "#F87171",
};

export const type = {
  display: { fontFamily: "Inter_700Bold", fontSize: 26, lineHeight: 34 },
  screenTitle: { fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 30 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 18, lineHeight: 26 },
  body: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  button: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 },
  price: { fontFamily: "Inter_700Bold", fontSize: 20, lineHeight: 26 },
} as const;

export function useTheme() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return { scheme, colors: scheme === "dark" ? dark : light };
}

export function panelChrome(colors: Palette) {
  return {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
  } as const;
}

/** Thẻ đơn B2B: viền nhẹ + bóng mềm (Pro Max / Figma Coldi). */
export function elevatedCard(colors: Palette): ViewStyle {
  return {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {},
    }),
  };
}

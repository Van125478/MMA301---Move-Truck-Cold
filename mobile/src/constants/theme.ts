import { useColorScheme } from "react-native";

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
  card: 20,
  mark: 14,
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
  focus: string;
  shadow: string;
  neutralBg: string;
  neutralInk: string;
  successBg: string;
  successInk: string;
  warningBg: string;
  warningInk: string;
  dangerBg: string;
  dangerInk: string;
};

const light: Palette = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  field: "#F8FAFC",
  ink: "#0F172A",
  muted: "#475569",
  hint: "#94A3B8",
  line: "#E2E8F0",
  brand: "#1E3A8A",
  primary: "#1E3A8A",
  onPrimary: "#FFFFFF",
  onPrimaryMuted: "#DBEAFE",
  primaryPressed: "#172554",
  badge: "#E8EEF9",
  badgeInk: "#1E3A8A",
  danger: "#B91C1C",
  focus: "#1E3A8A",
  shadow: "#0F172A",
  neutralBg: "#F1F5F9",
  neutralInk: "#475569",
  successBg: "#DCFCE7",
  successInk: "#15803D",
  warningBg: "#FEF3C7",
  warningInk: "#B45309",
  dangerBg: "#FEE2E2",
  dangerInk: "#B91C1C",
};

const dark: Palette = {
  background: "#0B1220",
  surface: "#111827",
  field: "#0F172A",
  ink: "#F8FAFC",
  muted: "#CBD5E1",
  hint: "#94A3B8",
  line: "#334155",
  brand: "#172554",
  primary: "#2563EB",
  onPrimary: "#FFFFFF",
  onPrimaryMuted: "#DBEAFE",
  primaryPressed: "#1D4ED8",
  badge: "#172554",
  badgeInk: "#DBEAFE",
  danger: "#FCA5A5",
  focus: "#93C5FD",
  shadow: "#000000",
  neutralBg: "#1E293B",
  neutralInk: "#CBD5E1",
  successBg: "#064E3B",
  successInk: "#6EE7B7",
  warningBg: "#78350F",
  warningInk: "#FCD34D",
  dangerBg: "#450A0A",
  dangerInk: "#FCA5A5",
};

export const type = {
  display: { fontFamily: "Inter_700Bold", fontSize: 28, lineHeight: 36 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 20, lineHeight: 28 },
  body: { fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 24 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  button: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20 },
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

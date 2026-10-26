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
  ink: string;
  muted: string;
  line: string;
  primary: string;
  onPrimary: string;
  primaryPressed: string;
  danger: string;
  focus: string;
  shadow: string;
};

const light: Palette = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  ink: "#1E293B",
  muted: "#475569",
  line: "#E2E8F0",
  primary: "#1E3A8A",
  onPrimary: "#FFFFFF",
  primaryPressed: "#172554",
  danger: "#B91C1C",
  focus: "#1E3A8A",
  shadow: "#0F172A",
};

const dark: Palette = {
  background: "#0B1220",
  surface: "#111827",
  ink: "#F8FAFC",
  muted: "#CBD5E1",
  line: "#334155",
  primary: "#2563EB",
  onPrimary: "#FFFFFF",
  primaryPressed: "#1D4ED8",
  danger: "#FCA5A5",
  focus: "#93C5FD",
  shadow: "#000000",
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

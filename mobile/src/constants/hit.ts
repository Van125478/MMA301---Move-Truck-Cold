import { Platform, type ViewStyle } from "react-native";

export const pointer: ViewStyle = Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : {};

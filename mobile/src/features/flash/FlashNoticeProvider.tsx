import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pointer } from "../../constants/hit";
import { radius, space, useTheme } from "../../constants/theme";

const AUTO_HIDE_MS = 3600;

export type FlashNoticeKind = "delivery" | "incident" | "assign" | "chat";

export type FlashNoticePayload = {
  kind: FlashNoticeKind;
  title: string;
  body: string;
};

type FlashContextValue = {
  show: (payload: FlashNoticePayload) => void;
};

const FlashNoticeContext = createContext<FlashContextValue | null>(null);

const kindIcon: Record<FlashNoticeKind, keyof typeof MaterialCommunityIcons.glyphMap> = {
  delivery: "check-circle-outline",
  incident: "alert-circle-outline",
  assign: "clipboard-account-outline",
  chat: "email-outline",
};

export function FlashNoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<FlashNoticePayload | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setNotice(null);
  }, []);

  const show = useCallback(
    (payload: FlashNoticePayload) => {
      if (timer.current) clearTimeout(timer.current);
      setNotice(payload);
      timer.current = setTimeout(() => {
        timer.current = null;
        setNotice(null);
      }, AUTO_HIDE_MS);
    },
    [],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <FlashNoticeContext.Provider value={value}>
      <View style={styles.shell}>
        {children}
        <FlashNoticeBanner notice={notice} onDismiss={dismiss} />
      </View>
    </FlashNoticeContext.Provider>
  );
}

export function useFlashNotice(): FlashContextValue {
  const ctx = useContext(FlashNoticeContext);
  if (!ctx) throw new Error("useFlashNotice must be used within FlashNoticeProvider");
  return ctx;
}

function FlashNoticeBanner({
  notice,
  onDismiss,
}: {
  notice: FlashNoticePayload | null;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!notice) {
      Animated.parallel([
        Animated.timing(slide, { toValue: -140, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
      return;
    }
    slide.setValue(-140);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220 }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [notice, opacity, slide]);

  if (!notice) return null;

  const accent =
    notice.kind === "delivery"
      ? colors.success
      : notice.kind === "incident"
        ? colors.warning
        : notice.kind === "chat"
          ? colors.primary
          : colors.primary;
  const accentBg =
    notice.kind === "delivery"
      ? colors.successBg
      : notice.kind === "incident"
        ? colors.warningBg
        : notice.kind === "chat"
          ? colors.badge
          : colors.badge;

  return (
    <View pointerEvents="box-none" style={[styles.overlay, { paddingTop: insets.top + space.xs }]}>
      <Animated.View style={{ opacity, transform: [{ translateY: slide }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${notice.title}. ${notice.body}. Bấm để đóng.`}
          onPress={onDismiss}
          style={[
            styles.card,
            pointer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.line,
              ...Platform.select({
                ios: {
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.14,
                  shadowRadius: 16,
                },
                android: { elevation: 8 },
                default: {},
              }),
            },
          ]}
        >
          <View style={[styles.appMark, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="snowflake" size={18} color={colors.onPrimary} />
          </View>
          <View style={styles.copy}>
            <View style={styles.titleRow}>
              <Text numberOfLines={1} style={[styles.appName, { color: colors.muted }]}>
                COLDi
              </Text>
              <Text style={[styles.time, { color: colors.hint }]}>vừa xong</Text>
            </View>
            <Text numberOfLines={1} style={[styles.title, { color: colors.ink }]}>
              {notice.title}
            </Text>
            <Text numberOfLines={2} style={[styles.body, { color: colors.muted }]}>
              {notice.body}
            </Text>
          </View>
          <View style={[styles.kindMark, { backgroundColor: accentBg }]}>
            <MaterialCommunityIcons name={kindIcon[notice.kind]} size={22} color={accent} />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: space.md,
    zIndex: 9999,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    padding: space.md,
    minHeight: 72,
  },
  appMark: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  appName: { fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 16 },
  time: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 14 },
  title: { fontFamily: "Inter_700Bold", fontSize: 15, lineHeight: 20 },
  body: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  kindMark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});

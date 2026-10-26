import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wordmark } from "../../components/brand/Wordmark";
import { Field } from "../../components/common/Field";
import { FieldError } from "../../components/common/FieldError";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { radius, space, type as textType, useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import type { RootStackParamList } from "../../navigation/types";
import { ApiError } from "../../services/api/client";
import { clearRememberedId, readRememberedId, writeRememberedId } from "../../services/api/sessionStore";

export function LoginScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { login } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const identifierRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [secure, setSecure] = useState(true);
  const [pending, setPending] = useState(false);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const gutter = width >= 768 ? space.xxl : space.lg;
  const cardWidth = Math.min(width - gutter * 2, 440);

  useEffect(() => {
    let active = true;
    void readRememberedId().then((saved) => {
      if (!active || !saved) return;
      setIdentifier(saved);
      setRemember(true);
    });
    return () => {
      active = false;
    };
  }, []);

  function openUnavailable(topic: "register" | "forgot") {
    navigation.navigate("Unavailable", { topic });
  }

  async function submit() {
    const name = identifier.trim();
    const missingName = name.length === 0 ? "Nhập email hoặc tên đăng nhập." : null;
    const missingPassword = password.length === 0 ? "Nhập mật khẩu." : null;
    setIdentifierError(missingName);
    setPasswordError(missingPassword);
    setFormError(null);
    if (missingName || missingPassword) {
      setFormError("Còn ô chưa nhập.");
      if (missingName) identifierRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }
    if (password.length > 72) {
      setPasswordError("Mật khẩu không hợp lệ.");
      return;
    }
    setPending(true);
    try {
      await login(name, password);
      if (remember) await writeRememberedId(name);
      else await clearRememberedId();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Không đăng nhập được. Hãy thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingHorizontal: gutter, paddingVertical: space.xxl }]}
        >
          <Wordmark />
          <View
            style={[
              styles.card,
              {
                width: cardWidth,
                backgroundColor: colors.surface,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.6} style={[styles.title, { color: colors.ink }]}>
              Chào mừng trở lại
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Đăng nhập để tiếp tục với tài khoản của bạn.</Text>
            {formError ? (
              <View accessibilityRole="alert" style={styles.alert}>
                <FieldError message={formError} />
              </View>
            ) : null}
            <Field
              label="Email hoặc tên đăng nhập"
              value={identifier}
              onChangeText={setIdentifier}
              error={identifierError}
              inputRef={identifierRef}
              placeholder="shipper.demo@coldi.local"
              keyboardType="email-address"
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              maxLength={254}
            />
            <Field
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              error={passwordError}
              inputRef={passwordRef}
              placeholder="Nhập mật khẩu"
              secureTextEntry={secure}
              secureVisible={!secure}
              onToggleSecure={() => setSecure((value) => !value)}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
              maxLength={72}
            />
            <View style={styles.row}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: remember }}
                accessibilityLabel="Ghi nhớ đăng nhập"
                onPress={() => setRemember((value) => !value)}
                style={styles.remember}
              >
                <MaterialCommunityIcons
                  name={remember ? "checkbox-marked-outline" : "checkbox-blank-outline"}
                  size={22}
                  color={remember ? colors.primary : colors.muted}
                />
                <Text style={[styles.rememberText, { color: colors.ink }]}>Ghi nhớ đăng nhập</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quên mật khẩu"
                onPress={() => openUnavailable("forgot")}
                style={styles.linkHit}
              >
                <Text style={[styles.link, { color: colors.primary }]}>Quên mật khẩu?</Text>
              </Pressable>
            </View>
            <PrimaryButton label="Đăng nhập" pendingLabel="Đang đăng nhập…" onPress={() => void submit()} pending={pending} />
            <View style={styles.signup}>
              <Text style={[styles.caption, { color: colors.muted }]}>Chưa có tài khoản?</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đăng ký"
                onPress={() => openUnavailable("register")}
                style={styles.linkHit}
              >
                <Text style={[styles.link, { color: colors.primary }]}>Đăng ký</Text>
              </Pressable>
            </View>
          </View>
          <Text style={[styles.footer, { color: colors.muted }]}>© 2026 Coldi Freight</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: "center" },
  card: {
    marginTop: space.xxl,
    borderRadius: radius.card,
    padding: space.xl,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 2,
  },
  title: { ...textType.display },
  subtitle: { ...textType.body, marginTop: space.sm },
  alert: { marginTop: space.lg },
  row: {
    marginTop: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    flexWrap: "wrap",
  },
  remember: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: space.sm, paddingRight: space.sm },
  rememberText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22 },
  linkHit: { minHeight: 48, justifyContent: "center", paddingHorizontal: space.xs },
  link: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  signup: { marginTop: space.lg, minHeight: 48, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
  caption: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22 },
  footer: { marginTop: space.xxl, fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20 },
});

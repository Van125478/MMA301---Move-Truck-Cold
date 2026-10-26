import { useRef, useState, type ComponentRef } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandHeader } from "../../components/brand/Wordmark";
import { Field } from "../../components/common/Field";
import { FieldError } from "../../components/common/FieldError";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { panelChrome, space, type as textType, useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import { ApiError } from "../../services/api/client";

export function ChangePasswordScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { session, changePassword, logout } = useAuth();
  const confirmRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [secure, setSecure] = useState(true);
  const [pending, setPending] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const gutter = width >= 768 ? space.xxl : space.lg;
  const cardWidth = Math.min(width - gutter * 2, 440);
  const account = session.status === "authenticated" ? session.user.email || session.user.username || "" : "";

  async function submit() {
    const lengthError = password.length < 8 || password.length > 72 ? "Mật khẩu cần từ 8 đến 72 ký tự." : null;
    const mismatch = password !== confirm ? "Mật khẩu nhập lại chưa khớp." : null;
    setPasswordError(lengthError);
    setConfirmError(mismatch);
    setFormError(lengthError || mismatch ? "Chưa đổi được mật khẩu." : null);
    if (lengthError || mismatch) return;
    setPending(true);
    try {
      await changePassword(password);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Không đổi được mật khẩu. Hãy thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.lg }]}
        >
          <View style={[styles.column, { width: cardWidth }]}>
          <BrandHeader />
          <View style={[styles.card, panelChrome(colors)]}>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={[styles.title, { color: colors.ink }]}>
              Đổi mật khẩu tạm
            </Text>
            <Text style={[styles.body, { color: colors.muted }]}>
              {account ? `${account} cần đặt mật khẩu mới trước khi vào app.` : "Tài khoản cần đặt mật khẩu mới trước khi vào app."} Mật khẩu từ 8 đến 72 ký tự.
            </Text>
            {formError ? (
              <View accessibilityRole="alert">
                <FieldError message={formError} />
              </View>
            ) : null}
            <Field
              label="Mật khẩu mới"
              value={password}
              onChangeText={setPassword}
              error={passwordError}
              secureTextEntry={secure}
              secureVisible={!secure}
              onToggleSecure={() => setSecure((value) => !value)}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              maxLength={72}
            />
            <Field
              label="Nhập lại mật khẩu"
              value={confirm}
              onChangeText={setConfirm}
              error={confirmError}
              inputRef={confirmRef}
              secureTextEntry={secure}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
              maxLength={72}
            />
            <PrimaryButton label="Lưu mật khẩu" pendingLabel="Đang lưu…" onPress={() => void submit()} pending={pending} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đăng xuất"
              onPress={() => void logout()}
              style={styles.logout}
            >
              <Text style={[styles.logoutLabel, { color: colors.primary }]}>Đăng xuất</Text>
            </Pressable>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: "center" },
  column: { flexGrow: 1 },
  card: { marginTop: space.xl, padding: space.xl },
  title: { ...textType.display },
  body: { ...textType.body, marginTop: space.sm },
  logout: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: space.sm },
  logoutLabel: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 24 },
});

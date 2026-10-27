import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandHeader } from "../../components/brand/Wordmark";
import { PhoneFrame } from "../../components/common/PhoneFrame";
import { Field } from "../../components/common/Field";
import { FieldError } from "../../components/common/FieldError";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { panelChrome, space, type as textType, useTheme } from "../../constants/theme";
import type { RootStackParamList } from "../../navigation/types";
import { ApiError } from "../../services/api/client";
import { resetPassword } from "../../services/api/auth";

export function ResetPasswordScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ResetPassword">>();
  const email = route.params.email;
  const issuedCode = route.params.resetCode ?? "";
  const [resetCode, setResetCode] = useState(issuedCode);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [secure, setSecure] = useState(true);
  const [pending, setPending] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const gutter = width >= 768 ? space.xxl : space.lg;
  const cardWidth = Math.min(width - gutter * 2, 440);

  async function submit() {
    const code = resetCode.trim();
    const nextCode = code.length === 0 ? "Nhập mã đặt lại." : null;
    const nextPassword = password.length < 8 || password.length > 72 ? "Mật khẩu cần từ 8 đến 72 ký tự." : null;
    const nextConfirm = password !== confirm ? "Mật khẩu nhập lại chưa khớp." : null;
    setCodeError(nextCode);
    setPasswordError(nextPassword);
    setConfirmError(nextConfirm);
    setFormError(nextCode || nextPassword || nextConfirm ? "Chưa đặt lại được mật khẩu." : null);
    if (nextCode || nextPassword || nextConfirm) return;
    setPending(true);
    try {
      const message = await resetPassword(email, code, password);
      setDone(message);
      setFormError(null);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Không đặt lại được mật khẩu. Hãy thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <PhoneFrame>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.page, { paddingHorizontal: gutter }]}>
          <View style={{ width: cardWidth, alignSelf: "center" }}>
            <BrandHeader />
            <View style={[styles.card, panelChrome(colors)]}>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
                Đặt lại mật khẩu
              </Text>
              <Text style={[styles.body, { color: colors.muted }]}>{email}</Text>
              {issuedCode.length > 0 ? (
                <View style={[styles.codeBox, { backgroundColor: colors.badge }]}>
                  <Text style={[styles.codeLabel, { color: colors.badgeInk }]}>Mã đặt lại, dùng một lần trong 15 phút</Text>
                  <Text accessibilityLabel={`Mã đặt lại ${issuedCode}`} style={[styles.code, { color: colors.ink }]}>
                    {issuedCode}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.body, { color: colors.muted }]}>
                  Không có mã. Email chưa có tài khoản đang mở, hoặc tài khoản chỉ đăng nhập bằng tên đăng nhập.
                </Text>
              )}
              {done ? (
                <View accessibilityRole="alert" style={styles.alert}>
                  <Text style={[styles.body, { color: colors.ink }]}>{done}</Text>
                </View>
              ) : null}
              {formError ? (
                <View accessibilityRole="alert" style={styles.alert}>
                  <FieldError message={formError} />
                </View>
              ) : null}
              {done ? null : (
                <>
                  <Field
                    label="Mã đặt lại"
                    value={resetCode}
                    onChangeText={setResetCode}
                    error={codeError}
                    autoComplete="off"
                    maxLength={16}
                  />
                  <Field
                    label="Mật khẩu mới"
                    value={password}
                    onChangeText={setPassword}
                    error={passwordError}
                    placeholder="Ít nhất 8 ký tự"
                    secureTextEntry={secure}
                    secureVisible={!secure}
                    onToggleSecure={() => setSecure((value) => !value)}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    maxLength={72}
                  />
                  <Field
                    label="Nhập lại mật khẩu"
                    value={confirm}
                    onChangeText={setConfirm}
                    error={confirmError}
                    secureTextEntry={secure}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="go"
                    onSubmitEditing={() => void submit()}
                    maxLength={72}
                  />
                  <PrimaryButton label="Đặt lại mật khẩu" pendingLabel="Đang đặt lại…" onPress={() => void submit()} pending={pending} />
                </>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quay lại đăng nhập"
                onPress={() => navigation.popToTop()}
                style={styles.back}
              >
                <Text style={[styles.backText, { color: colors.primary }]}>Quay lại đăng nhập</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </PhoneFrame>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  page: { alignItems: "center", paddingTop: space.lg, paddingBottom: space.xl },
  card: { marginTop: space.xl, padding: space.xl },
  title: { ...textType.title },
  body: { ...textType.body, marginTop: space.md },
  alert: { marginTop: space.lg },
  codeBox: { marginTop: space.lg, borderRadius: 12, padding: space.lg },
  codeLabel: { fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 },
  code: { marginTop: space.sm, fontFamily: "Inter_700Bold", fontSize: 24, lineHeight: 32, letterSpacing: 2 },
  back: { marginTop: space.md, minHeight: 48, alignItems: "center", justifyContent: "center" },
  backText: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
});

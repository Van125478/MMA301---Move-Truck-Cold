import { useNavigation } from "@react-navigation/native";
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
import { requestPasswordReset } from "../../services/api/auth";

export function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const gutter = width >= 768 ? space.xxl : space.lg;
  const cardWidth = Math.min(width - gutter * 2, 440);

  async function submit() {
    const trimmed = email.trim();
    const invalid = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? "Nhập email hợp lệ." : null;
    setEmailError(invalid);
    setFormError(invalid ? "Còn thông tin chưa đúng." : null);
    if (invalid) return;
    setPending(true);
    try {
      const issued = await requestPasswordReset(trimmed);
      navigation.navigate("ResetPassword", {
        email: trimmed,
        ...(issued.resetCode ? { resetCode: issued.resetCode } : {}),
      });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Không lấy được mã đặt lại. Hãy thử lại.");
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
                Quên mật khẩu
              </Text>
              <Text style={[styles.body, { color: colors.muted }]}>
                Nhập email của tài khoản. Máy local chưa gửi thư, nên mã hiện ở bước sau nếu email đang mở. Tài xế chỉ có tên đăng nhập thì nhờ nhà xe cấp lại.
              </Text>
              {formError ? (
                <View accessibilityRole="alert" style={styles.alert}>
                  <FieldError message={formError} />
                </View>
              ) : null}
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                error={emailError}
                placeholder="email@congty.com"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
                maxLength={160}
              />
              <PrimaryButton label="Lấy mã đặt lại" pendingLabel="Đang lấy mã…" onPress={() => void submit()} pending={pending} />
              <Pressable accessibilityRole="button" accessibilityLabel="Quay lại đăng nhập" onPress={() => navigation.goBack()} style={styles.back}>
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
  back: { marginTop: space.md, minHeight: 48, alignItems: "center", justifyContent: "center" },
  backText: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
});

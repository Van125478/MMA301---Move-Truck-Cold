import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useRef, useState, type ComponentRef } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandHeader } from "../../components/brand/Wordmark";
import { Field } from "../../components/common/Field";
import { FieldError } from "../../components/common/FieldError";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { panelChrome, space, type as textType, useTheme } from "../../constants/theme";
import { useAuth } from "../../features/auth/AuthProvider";
import type { RootStackParamList } from "../../navigation/types";
import { ApiError } from "../../services/api/client";

type PublicRole = "SHIPPER" | "CARRIER";

const roles: { value: PublicRole; label: string }[] = [
  { value: "SHIPPER", label: "Chủ hàng" },
  { value: "CARRIER", label: "Nhà xe" },
];

export function RegisterScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { register } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<PublicRole | null>(null);
  const [secure, setSecure] = useState(true);
  const [pending, setPending] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const gutter = width >= 768 ? space.xxl : space.lg;
  const cardWidth = Math.min(width - gutter * 2, 440);

  async function submit() {
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();
    const nextName = trimmedName.length === 0 || trimmedName.length > 80 ? "Tên hiển thị cần từ 1 đến 80 ký tự." : null;
    const nextEmail = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) ? "Nhập email hợp lệ." : null;
    const nextPassword = password.length < 8 || password.length > 72 ? "Mật khẩu cần từ 8 đến 72 ký tự." : null;
    const nextRole = role ? null : "Chọn chủ hàng hoặc nhà xe.";
    setNameError(nextName);
    setEmailError(nextEmail);
    setPasswordError(nextPassword);
    setRoleError(nextRole);
    setFormError(nextName || nextEmail || nextPassword || nextRole ? "Còn thông tin đăng ký chưa đúng." : null);
    if (nextName || nextEmail || nextPassword || !role) return;

    setPending(true);
    try {
      await register({ email: trimmedEmail, password, displayName: trimmedName, role });
    } catch (error) {
      if (error instanceof ApiError) {
        setNameError(error.fields?.displayName ?? null);
        setEmailError(error.fields?.email ?? null);
        setPasswordError(error.fields?.password ?? null);
        setRoleError(error.fields?.role ?? null);
        setFormError(error.message);
      } else {
        setFormError("Không tạo được tài khoản. Hãy thử lại.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.page, { paddingHorizontal: gutter }]}>
          <View style={{ width: cardWidth }}>
            <BrandHeader />
            <View style={[styles.card, panelChrome(colors)]}>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
                Tạo tài khoản
              </Text>
              <Text style={[styles.body, { color: colors.muted }]}>Chủ hàng và nhà xe dùng được ngay. Tài xế do nhà xe cấp.</Text>
              {formError ? (
                <View accessibilityRole="alert" style={styles.alert}>
                  <FieldError message={formError} />
                </View>
              ) : null}
              <Field
                label="Tên hiển thị"
                value={displayName}
                onChangeText={setDisplayName}
                error={nameError}
                placeholder="Tên kho hoặc nhà xe"
                autoComplete="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                maxLength={80}
              />
              <Text style={[styles.label, { color: colors.ink }]}>Vai trò</Text>
              <View style={styles.roles}>
                {roles.map((item) => {
                  const selected = role === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={item.label}
                      onPress={() => setRole(item.value)}
                      style={[
                        styles.role,
                        {
                          borderColor: selected ? colors.primary : colors.line,
                          backgroundColor: selected ? colors.badge : colors.field,
                        },
                      ]}
                    >
                      <Text style={[styles.roleText, { color: selected ? colors.primary : colors.ink }]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {roleError ? <FieldError message={roleError} /> : null}
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                error={emailError}
                inputRef={emailRef}
                placeholder="email@congty.com"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                maxLength={160}
              />
              <Field
                label="Mật khẩu"
                value={password}
                onChangeText={setPassword}
                error={passwordError}
                inputRef={passwordRef}
                placeholder="Ít nhất 8 ký tự"
                secureTextEntry={secure}
                secureVisible={!secure}
                onToggleSecure={() => setSecure((value) => !value)}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
                maxLength={72}
              />
              <PrimaryButton label="Tạo tài khoản" pendingLabel="Đang tạo tài khoản…" onPress={() => void submit()} pending={pending} />
              <Pressable accessibilityRole="button" accessibilityLabel="Quay lại đăng nhập" onPress={() => navigation.goBack()} style={styles.back}>
                <Text style={[styles.backText, { color: colors.primary }]}>Quay lại đăng nhập</Text>
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
  page: { alignItems: "center", paddingTop: space.lg, paddingBottom: space.xl },
  card: { marginTop: space.xl, padding: space.xl },
  title: { ...textType.title },
  body: { ...textType.body, marginTop: space.md },
  alert: { marginTop: space.lg },
  label: { marginTop: space.lg, fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  roles: { marginTop: space.sm, flexDirection: "row", gap: space.sm },
  role: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: space.sm },
  roleText: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
  back: { marginTop: space.md, minHeight: 48, alignItems: "center", justifyContent: "center" },
  backText: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 22 },
});

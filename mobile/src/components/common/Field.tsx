import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, type ComponentRef, type Ref } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { radius, space, useTheme } from "../../constants/theme";
import { FieldError } from "./FieldError";

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error: string | null;
  inputRef?: Ref<ComponentRef<typeof TextInput>>;
  placeholder?: string;
  secureTextEntry?: boolean;
  onToggleSecure?: () => void;
  secureVisible?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: () => void;
  maxLength?: number;
};

export function Field({
  label,
  value,
  onChangeText,
  error,
  inputRef,
  placeholder,
  secureTextEntry,
  onToggleSecure,
  secureVisible,
  keyboardType,
  autoComplete,
  textContentType,
  returnKeyType,
  onSubmitEditing,
  maxLength,
}: FieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const spoken = error ? `${label}. ${error}` : label;

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      <View
        style={[
          styles.shell,
          {
            borderColor: error ? colors.danger : focused ? colors.focus : colors.line,
            backgroundColor: colors.field,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.hint}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={textContentType}
          importantForAutofill="yes"
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={spoken}
          style={[styles.input, { color: colors.ink }]}
        />
        {onToggleSecure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secureVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            hitSlop={8}
            onPress={onToggleSecure}
            style={styles.eye}
          >
            <MaterialCommunityIcons
              name={secureVisible ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={colors.muted}
            />
          </Pressable>
        ) : null}
      </View>
      <FieldError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: space.lg },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20, marginBottom: space.sm },
  shell: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radius.control,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: space.lg,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  eye: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
});

import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { createElement, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { pointer } from "../../constants/hit";
import { radius, space, useTheme } from "../../constants/theme";
import { FieldError } from "./FieldError";

type Props = {
  label: string;
  mode: "date" | "time";
  /** `YYYY-MM-DD` hoặc `HH:mm`; chuỗi rỗng khi chưa chọn. */
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  /** Chỉ cho mode "date": `YYYY-MM-DD` sớm nhất được chọn. */
  minDate?: string;
};

const two = (n: number) => String(n).padStart(2, "0");

export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}

function toDate(mode: "date" | "time", value: string): Date {
  const now = new Date();
  if (mode === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)));
  }
  if (mode === "time" && /^\d{2}:\d{2}$/.test(value)) {
    now.setHours(Number(value.slice(0, 2)), Number(value.slice(3, 5)), 0, 0);
  }
  return now;
}

function fromDate(mode: "date" | "time", date: Date): string {
  return mode === "date" ? todayIso(date) : `${two(date.getHours())}:${two(date.getMinutes())}`;
}

function display(mode: "date" | "time", value: string): string | null {
  if (!value) return null;
  if (mode === "time") return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export function DateTimeField({ label, mode, value, onChange, error, minDate }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const shown = display(mode, value);
  const borderColor = error ? colors.danger : colors.line;

  if (Platform.OS === "web") {
    return (
      <View style={styles.block}>
        <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
        {createElement("input", {
          type: mode,
          value,
          min: mode === "date" ? minDate : undefined,
          "aria-label": label,
          onChange: (event: { target: { value: string } }) => onChange(event.target.value),
          style: {
            minHeight: 52,
            padding: "0 16px",
            borderRadius: radius.control,
            border: `1px solid ${borderColor}`,
            backgroundColor: colors.field,
            color: colors.ink,
            fontSize: 16,
            fontFamily: "Inter_400Regular, sans-serif",
          },
        })}
        <FieldError message={error} />
      </View>
    );
  }

  function handle(event: DateTimePickerEvent, selected?: Date) {
    setOpen(Platform.OS === "ios");
    if (event.type === "set" && selected) onChange(fromDate(mode, selected));
  }

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shown ? `${label}: ${shown}` : `${label}: chưa chọn`}
        onPress={() => setOpen(true)}
        style={[styles.shell, pointer, { borderColor, backgroundColor: colors.field }]}
      >
        <Text style={[styles.value, { color: shown ? colors.ink : colors.hint }]}>
          {shown ?? (mode === "date" ? "Chọn ngày" : "Chọn giờ")}
        </Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={toDate(mode, value)}
          mode={mode}
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={mode === "date" && minDate ? toDate("date", minDate) : undefined}
          onChange={handle}
        />
      ) : null}
      <FieldError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: space.md, gap: space.xs },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  shell: { minHeight: 52, borderWidth: 1, borderRadius: radius.control, paddingHorizontal: space.md, justifyContent: "center" },
  value: { fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 24 },
});

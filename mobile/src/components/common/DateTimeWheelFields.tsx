import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMemo, useState, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { pointer } from "../../constants/hit";
import { radius, space, useTheme } from "../../constants/theme";
import { Field } from "./Field";
import { FieldError } from "./FieldError";

type Props = {
  dateLabel: string;
  fromLabel: string;
  toLabel: string;
  dateValue: string;
  fromValue: string;
  toValue: string;
  dateError: string | null;
  fromError: string | null;
  toError: string | null;
  onDateChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
};

export function DateTimeWheelFields(props: Props) {
  if (Platform.OS === "web") {
    return <DateTimeWheelFieldsWeb {...props} />;
  }
  return <DateTimeWheelFieldsNative {...props} />;
}

function DateTimeWheelFieldsWeb({
  dateLabel,
  fromLabel,
  toLabel,
  dateValue,
  fromValue,
  toValue,
  dateError,
  fromError,
  toError,
  onDateChange,
  onFromChange,
  onToChange,
}: Props) {
  return (
    <View>
      <Field
        label={`${dateLabel} (năm-tháng-ngày)`}
        value={dateValue}
        onChangeText={onDateChange}
        error={dateError}
        placeholder="2026-10-30"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />
      <Field
        label={`${fromLabel} (giờ:phút)`}
        value={fromValue}
        onChangeText={onFromChange}
        error={fromError}
        placeholder="08:00"
        keyboardType="numbers-and-punctuation"
        maxLength={5}
      />
      <Field
        label={`${toLabel} (giờ:phút)`}
        value={toValue}
        onChangeText={onToChange}
        error={toError}
        placeholder="11:00"
        keyboardType="numbers-and-punctuation"
        maxLength={5}
      />
    </View>
  );
}

type AndroidTarget = "date" | "from" | "to" | null;

function DateTimeWheelFieldsNative({
  dateLabel,
  fromLabel,
  toLabel,
  dateValue,
  fromValue,
  toValue,
  dateError,
  fromError,
  toError,
  onDateChange,
  onFromChange,
  onToChange,
}: Props) {
  const { colors } = useTheme();
  const [androidTarget, setAndroidTarget] = useState<AndroidTarget>(null);

  const dateDate = useMemo(() => parseCalendarDate(dateValue), [dateValue]);
  const fromDate = useMemo(() => parseClockTime(fromValue, 8, 0), [fromValue]);
  const toDate = useMemo(() => parseClockTime(toValue, 11, 0), [toValue]);

  function onAndroidChange(event: DateTimePickerEvent, picked?: Date) {
    if (event.type === "set" && picked) {
      if (androidTarget === "date") onDateChange(formatCalendarDate(picked));
      if (androidTarget === "from") onFromChange(formatClockTime(picked));
      if (androidTarget === "to") onToChange(formatClockTime(picked));
    }
    setAndroidTarget(null);
  }

  if (Platform.OS === "android") {
    return (
      <View style={styles.block}>
        <WheelRow
          label={dateLabel}
          value={dateValue || "Chạm để chọn ngày"}
          hint="năm · tháng · ngày"
          error={dateError}
          onPress={() => setAndroidTarget("date")}
        />
        <WheelRow
          label={fromLabel}
          value={fromValue || "Chạm để chọn giờ"}
          hint="giờ · phút"
          error={fromError}
          onPress={() => setAndroidTarget("from")}
        />
        <WheelRow
          label={toLabel}
          value={toValue || "Chạm để chọn giờ"}
          hint="giờ · phút"
          error={toError}
          onPress={() => setAndroidTarget("to")}
        />
        {androidTarget === "date" ? (
          <DateTimePicker
            value={dateDate}
            mode="date"
            display="spinner"
            onChange={onAndroidChange}
            locale="vi-VN"
          />
        ) : null}
        {androidTarget === "from" ? (
          <DateTimePicker
            value={fromDate}
            mode="time"
            is24Hour
            display="spinner"
            onChange={onAndroidChange}
            locale="vi-VN"
          />
        ) : null}
        {androidTarget === "to" ? (
          <DateTimePicker
            value={toDate}
            mode="time"
            is24Hour
            display="spinner"
            onChange={onAndroidChange}
            locale="vi-VN"
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <WheelSection
        label={dateLabel}
        hint="Lướt chọn năm, tháng, ngày"
        error={dateError}
        borderColor={colors.line}
        surface={colors.surface}
      >
        <DateTimePicker
          value={dateDate}
          mode="date"
          display="spinner"
          locale="vi-VN"
          themeVariant="light"
          onChange={(_, picked) => {
            if (picked) onDateChange(formatCalendarDate(picked));
          }}
          style={styles.iosWheel}
        />
      </WheelSection>
      <WheelSection
        label={fromLabel}
        hint="Giờ bắt đầu (24h)"
        error={fromError}
        borderColor={colors.line}
        surface={colors.surface}
      >
        <DateTimePicker
          value={fromDate}
          mode="time"
          is24Hour
          display="spinner"
          locale="vi-VN"
          themeVariant="light"
          onChange={(_, picked) => {
            if (picked) onFromChange(formatClockTime(picked));
          }}
          style={styles.iosWheel}
        />
      </WheelSection>
      <WheelSection
        label={toLabel}
        hint="Giờ kết thúc (24h)"
        error={toError}
        borderColor={colors.line}
        surface={colors.surface}
      >
        <DateTimePicker
          value={toDate}
          mode="time"
          is24Hour
          display="spinner"
          locale="vi-VN"
          themeVariant="light"
          onChange={(_, picked) => {
            if (picked) onToChange(formatClockTime(picked));
          }}
          style={styles.iosWheel}
        />
      </WheelSection>
    </View>
  );
}

function WheelSection({
  label,
  hint,
  error,
  borderColor,
  surface,
  children,
}: {
  label: string;
  hint: string;
  error: string | null;
  borderColor: string;
  surface: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text>
      <View style={[styles.wheelShell, { borderColor, backgroundColor: surface }]}>{children}</View>
      <FieldError message={error} />
    </View>
  );
}

function WheelRow({
  label,
  value,
  hint,
  error,
  onPress,
}: {
  label: string;
  value: string;
  hint: string;
  error: string | null;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={[styles.androidRow, pointer, { borderColor: error ? colors.danger : colors.line, backgroundColor: colors.field }]}
      >
        <Text style={[styles.androidValue, { color: value.includes("Chạm") ? colors.hint : colors.ink }]}>{value}</Text>
        <Text style={[styles.androidChevron, { color: colors.muted }]}>▾</Text>
      </Pressable>
      <FieldError message={error} />
    </View>
  );
}

function parseCalendarDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return now;
}

function formatCalendarDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseClockTime(value: string, hour: number, minute: number): Date {
  const base = new Date();
  base.setSeconds(0, 0);
  if (/^\d{2}:\d{2}$/.test(value)) {
    base.setHours(Number(value.slice(0, 2)), Number(value.slice(3, 5)), 0, 0);
    return base;
  }
  base.setHours(hour, minute, 0, 0);
  return base;
}

function formatClockTime(date: Date): string {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

const styles = StyleSheet.create({
  block: { marginTop: space.sm },
  section: { marginTop: space.lg },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  hint: { marginTop: 2, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 16 },
  wheelShell: { marginTop: space.sm, borderWidth: 1, borderRadius: radius.control, overflow: "hidden" },
  iosWheel: { height: 180, width: "100%" },
  androidRow: {
    marginTop: space.sm,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radius.control,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.lg,
  },
  androidValue: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 24 },
  androidChevron: { fontSize: 14, marginLeft: space.sm },
});

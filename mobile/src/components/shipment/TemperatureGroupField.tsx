import { StyleSheet, Pressable, Text, View } from "react-native";
import { radius, space, useTheme } from "../../constants/theme";
import type { TemperatureGroup } from "../../types/shipment";
import { FieldError } from "../common/FieldError";

const options: { value: TemperatureGroup; label: string }[] = [
  { value: "COOL", label: "Lạnh mát" },
  { value: "FROZEN", label: "Đông" },
  { value: "DEEP_FROZEN", label: "Cực lạnh" },
];

export function TemperatureGroupField({
  value,
  onChange,
  error,
}: {
  value: TemperatureGroup | null;
  onChange: (next: TemperatureGroup) => void;
  error: string | null;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: colors.ink }]}>Nhóm nhiệt</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? colors.primary : colors.field,
                  borderColor: selected ? colors.primary : colors.line,
                },
              ]}
            >
              <Text style={[styles.chipLabel, { color: selected ? colors.onPrimary : colors.ink }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <FieldError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: space.lg },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20, marginBottom: space.sm },
  row: { flexDirection: "row", gap: space.sm, flexWrap: "wrap" },
  chip: { minHeight: 44, paddingHorizontal: space.lg, borderRadius: radius.control, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  chipLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
});

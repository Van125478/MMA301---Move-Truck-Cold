import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ChoiceChip } from "../common/Feedback";
import { pointer } from "../../constants/hit";
import { space, useTheme } from "../../constants/theme";
import {
  catalogFiltersActive,
  defaultCatalogFilters,
  priceBandFilters,
  priceSortOptions,
  temperatureFilters,
  weightBandFilters,
  type CatalogFilters,
  type PriceBandFilter,
  type PriceSort,
  type TemperatureFilter,
  type WeightBandFilter,
} from "../../utils/catalog";

type Props = {
  filters: CatalogFilters;
  onChange: (patch: Partial<CatalogFilters>) => void;
  hideVehicleAll?: boolean;
};

const compactPrice: Record<PriceBandFilter, string> = {
  ALL: "Mọi giá",
  UNDER_5M: "≤5 tr",
  FROM_5M_TO_10M: "5–10 tr",
  OVER_10M: ">10 tr",
};

const compactWeight: Record<WeightBandFilter, string> = {
  ALL: "Mọi tải",
  UNDER_3T: "≤3 t",
  FROM_3T_TO_8T: "3–8 t",
  OVER_8T: ">8 t",
};

const compactSort: Record<PriceSort, string> = {
  priceDesc: "Cao ↓",
  priceAsc: "Thấp ↑",
};

function filterSummary(filters: CatalogFilters, hideVehicleAll: boolean): string {
  const parts: string[] = [];
  if (filters.temperature !== "ALL") {
    const row = temperatureFilters.find((item) => item.id === filters.temperature);
    parts.push(row?.label ?? "Loại xe");
  }
  if (filters.priceBand !== "ALL") parts.push(compactPrice[filters.priceBand]);
  if (filters.weightBand !== "ALL") parts.push(compactWeight[filters.weightBand]);
  if (filters.sort !== "priceDesc") parts.push(compactSort[filters.sort]);
  if (parts.length === 0) return hideVehicleAll ? "Chưa chọn bộ lọc" : "Tất cả đơn";
  return parts.join(" · ");
}

export function CatalogFilterBar({ filters, onChange, hideVehicleAll }: Props) {
  const { colors } = useTheme();
  const active = catalogFiltersActive(filters, "");
  const [open, setOpen] = useState(active);
  const summary = useMemo(() => filterSummary(filters, Boolean(hideVehicleAll)), [filters, hideVehicleAll]);

  const vehicleChips = hideVehicleAll
    ? ([{ id: "ALL" as const, label: "Tất cả" }, ...temperatureFilters.filter((item) => item.id !== "ALL")] as const)
    : temperatureFilters;

  return (
    <View style={[styles.root, { borderColor: colors.line, backgroundColor: colors.field }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? "Thu gọn bộ lọc" : "Mở bộ lọc"}
        onPress={() => setOpen((value) => !value)}
        style={[styles.toggle, pointer]}
      >
        <MaterialCommunityIcons name="tune-variant" size={20} color={colors.primary} />
        <View style={styles.toggleCopy}>
          <Text style={[styles.toggleTitle, { color: colors.ink }]}>Bộ lọc</Text>
        {!open ? (
          <Text numberOfLines={1} style={[styles.toggleSummary, { color: active ? colors.primary : colors.muted }]}>
            {summary}
          </Text>
        ) : null}
        </View>
        {active ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xóa bộ lọc"
            onPress={() => onChange(defaultCatalogFilters)}
            hitSlop={6}
            style={[styles.clearInline, pointer]}
          >
            <Text style={[styles.clearText, { color: colors.primary }]}>Xóa</Text>
          </Pressable>
        ) : null}
        <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={22} color={colors.muted} />
      </Pressable>

      {open ? (
        <View style={[styles.panel, { borderTopColor: colors.line }]}>
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {vehicleChips.map((item) => (
              <ChoiceChip
                key={`v-${item.id}`}
                label={item.label}
                selected={filters.temperature === item.id}
                onPress={() => onChange({ temperature: item.id as TemperatureFilter })}
              />
            ))}
          </ScrollView>
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {priceBandFilters.map((item) => (
              <ChoiceChip
                key={`p-${item.id}`}
                label={compactPrice[item.id]}
                selected={filters.priceBand === item.id}
                onPress={() => onChange({ priceBand: item.id })}
              />
            ))}
            <View style={[styles.sep, { backgroundColor: colors.line }]} />
            {priceSortOptions.map((item) => (
              <ChoiceChip
                key={`s-${item.id}`}
                label={compactSort[item.id]}
                selected={filters.sort === item.id}
                onPress={() => onChange({ sort: item.id })}
              />
            ))}
          </ScrollView>
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {weightBandFilters.map((item) => (
              <ChoiceChip
                key={`w-${item.id}`}
                label={compactWeight[item.id]}
                selected={filters.weightBand === item.id}
                onPress={() => onChange({ weightBand: item.id })}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  toggle: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, minHeight: 44 },
  toggleCopy: { flex: 1, minWidth: 0, gap: 2 },
  toggleTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  toggleSummary: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 16 },
  clearInline: { minHeight: 32, justifyContent: "center", paddingHorizontal: space.xs },
  clearText: { fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  panel: { gap: space.xs, paddingBottom: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  chips: { gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.xs },
  sep: { width: 1, height: 28, alignSelf: "center", marginHorizontal: space.xs },
});

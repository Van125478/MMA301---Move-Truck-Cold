import type { Shipment, TemperatureGroup } from "../types/shipment";

export type TemperatureFilter = "ALL" | TemperatureGroup;

export type PriceBandFilter = "ALL" | "UNDER_5M" | "FROM_5M_TO_10M" | "OVER_10M";

export type WeightBandFilter = "ALL" | "UNDER_3T" | "FROM_3T_TO_8T" | "OVER_8T";

export type PriceSort = "priceDesc" | "priceAsc";

export type CatalogFilters = {
  temperature: TemperatureFilter;
  priceBand: PriceBandFilter;
  weightBand: WeightBandFilter;
  sort: PriceSort;
};

export const defaultCatalogFilters: CatalogFilters = {
  temperature: "ALL",
  priceBand: "ALL",
  weightBand: "ALL",
  sort: "priceDesc",
};

export const temperatureFilters: readonly { id: TemperatureFilter; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "COOL", label: "Xe lạnh" },
  { id: "FROZEN", label: "Xe đông" },
  { id: "DEEP_FROZEN", label: "Xe cực lạnh" },
];

export const priceBandFilters: readonly { id: PriceBandFilter; label: string }[] = [
  { id: "ALL", label: "Tất cả giá" },
  { id: "UNDER_5M", label: "Dưới 5 triệu" },
  { id: "FROM_5M_TO_10M", label: "5–10 triệu" },
  { id: "OVER_10M", label: "Trên 10 triệu" },
];

export const priceSortOptions: readonly { id: PriceSort; label: string }[] = [
  { id: "priceDesc", label: "Giá cao → thấp" },
  { id: "priceAsc", label: "Giá thấp → cao" },
];

export const weightBandFilters: readonly { id: WeightBandFilter; label: string }[] = [
  { id: "ALL", label: "Tất cả tải" },
  { id: "UNDER_3T", label: "Dưới 3 tấn" },
  { id: "FROM_3T_TO_8T", label: "3–8 tấn" },
  { id: "OVER_8T", label: "Trên 8 tấn" },
];

export function vehicleKindLabel(group: TemperatureGroup): string {
  if (group === "FROZEN") return "Xe đông";
  if (group === "DEEP_FROZEN") return "Xe cực lạnh";
  return "Xe lạnh";
}

/** Bỏ dấu, kể cả đ, để tìm không phân biệt dấu. */
export function foldSearch(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

function matchesPriceBand(priceVnd: number, band: PriceBandFilter): boolean {
  if (band === "ALL") return true;
  if (band === "UNDER_5M") return priceVnd < 5_000_000;
  if (band === "FROM_5M_TO_10M") return priceVnd >= 5_000_000 && priceVnd <= 10_000_000;
  return priceVnd > 10_000_000;
}

function matchesWeightBand(weightTon: number | null, band: WeightBandFilter): boolean {
  if (band === "ALL") return true;
  if (weightTon == null || !Number.isFinite(weightTon)) return false;
  if (band === "UNDER_3T") return weightTon < 3;
  if (band === "FROM_3T_TO_8T") return weightTon >= 3 && weightTon <= 8;
  return weightTon > 8;
}

export function catalogFiltersActive(filters: CatalogFilters, query: string): boolean {
  return (
    query.trim().length > 0 ||
    filters.temperature !== "ALL" ||
    filters.priceBand !== "ALL" ||
    filters.weightBand !== "ALL" ||
    filters.sort !== "priceDesc"
  );
}

export function prepareCatalog(items: readonly Shipment[], query: string, filters: CatalogFilters): Shipment[] {
  const needle = foldSearch(query.trim());
  const matched = items.filter((item) => {
    if (filters.temperature !== "ALL" && item.temperatureGroup !== filters.temperature) return false;
    if (!matchesPriceBand(item.listedPriceVnd, filters.priceBand)) return false;
    if (!matchesWeightBand(item.cargoWeightTon, filters.weightBand)) return false;
    if (!needle) return true;
    const haystack = foldSearch(
      [
        item.cargoDescription,
        item.pickupLocation,
        item.deliveryLocation,
        item.pickupCompany,
        item.deliveryCompany,
        item.temperatureLabel,
        item.vehicleRequirement,
        item.statusLabel,
        item.id,
      ]
        .filter((part): part is string => Boolean(part))
        .join(" "),
    );
    return haystack.includes(needle);
  });
  return [...matched].sort((left, right) => {
    const price =
      filters.sort === "priceDesc"
        ? right.listedPriceVnd - left.listedPriceVnd
        : left.listedPriceVnd - right.listedPriceVnd;
    return price !== 0 ? price : left.id.localeCompare(right.id);
  });
}

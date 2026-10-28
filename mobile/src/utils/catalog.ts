import type { Shipment, TemperatureGroup } from "../types/shipment";

export type TemperatureFilter = "ALL" | TemperatureGroup;

export const temperatureFilters: readonly { id: TemperatureFilter; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "COOL", label: "Xe lạnh" },
  { id: "FROZEN", label: "Xe đông" },
  { id: "DEEP_FROZEN", label: "Xe cực lạnh" },
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

export function prepareCatalog(items: readonly Shipment[], query: string, group: TemperatureFilter): Shipment[] {
  const needle = foldSearch(query.trim());
  const matched = items.filter((item) => {
    if (group !== "ALL" && item.temperatureGroup !== group) return false;
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
  return [...matched].sort((left, right) => right.listedPriceVnd - left.listedPriceVnd || left.id.localeCompare(right.id));
}

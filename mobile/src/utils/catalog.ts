import type { Shipment, TemperatureGroup } from "../types/shipment";

export type TemperatureFilter = "ALL" | TemperatureGroup;

export const temperatureFilters: readonly { id: TemperatureFilter; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "COOL", label: "Lạnh mát" },
  { id: "FROZEN", label: "Đông" },
  { id: "DEEP_FROZEN", label: "Cực lạnh" },
];

export function prepareCatalog(items: readonly Shipment[], query: string, group: TemperatureFilter): Shipment[] {
  const needle = query.trim().toLowerCase();
  const matched = items.filter((item) => {
    if (group !== "ALL" && item.temperatureGroup !== group) return false;
    if (!needle) return true;
    return [item.cargoDescription, item.pickupLocation, item.deliveryLocation, item.temperatureLabel, item.vehicleRequirement, item.id]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
  return [...matched].sort((left, right) => right.listedPriceVnd - left.listedPriceVnd || left.id.localeCompare(right.id));
}

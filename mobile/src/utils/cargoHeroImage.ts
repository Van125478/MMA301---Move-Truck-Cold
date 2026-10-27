import type { ShipmentStatus, TemperatureGroup } from "../types/shipment";

const photos = {
  produce: require("../../assets/landing/rau-qua.jpg"),
  hold: require("../../assets/landing/thung-lanh.jpg"),
  road: require("../../assets/landing/xe-lanh.jpg"),
} as const;

/** Decorative cold-chain photo for list/detail cards (not shipment-specific media). */
export function cargoHeroImage(temperatureGroup: TemperatureGroup, status?: ShipmentStatus): number {
  if (status === "IN_TRANSIT" || status === "PICKUP_CONFIRMED") return photos.road;
  if (temperatureGroup === "FROZEN" || temperatureGroup === "DEEP_FROZEN") return photos.hold;
  return photos.produce;
}

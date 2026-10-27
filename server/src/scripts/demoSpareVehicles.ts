import type { TemperatureGroup } from "../models/shipment.js";

/** Pool vehicles for assignment demos (not tied to a driver account). */
export const demoSpareVehicles = [
  {
    label: "Xe lạnh 5 tấn · 51H-112.33",
    plate: "51H-11233",
    vehicleKind: "REEFER_TRUCK" as const,
    temperatureGroup: "COOL" as TemperatureGroup,
    capacityTon: 5,
  },
  {
    label: "Xe lạnh 10 tấn · 51K-445.67",
    plate: "51K-44567",
    vehicleKind: "REEFER_TRUCK" as const,
    temperatureGroup: "FROZEN" as TemperatureGroup,
    capacityTon: 10,
  },
  {
    label: "Container lạnh · 51L-889.01",
    plate: "51L-88901",
    vehicleKind: "REEFER_CONTAINER" as const,
    temperatureGroup: "FROZEN" as TemperatureGroup,
    capacityTon: 12,
  },
  {
    label: "Van lạnh 1,8 tấn · 51M-220.44",
    plate: "51M-22044",
    vehicleKind: "REEFER_VAN" as const,
    temperatureGroup: "DEEP_FROZEN" as TemperatureGroup,
    capacityTon: 1.8,
  },
] as const;

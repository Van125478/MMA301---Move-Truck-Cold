import { temperatureLabels, type ShipmentStatus, type TemperatureGroup } from "../models/shipment.js";
import { toTrackingDto, type StoredLocation } from "../gps/trackingView.js";

export type ShipmentDto = {
  id: string;
  shipperId: string;
  cargoDescription: string;
  pickupCompany: string | null;
  pickupLocation: string;
  pickupContactName: string | null;
  pickupPhone: string | null;
  pickupEmail: string | null;
  pickupDate: string | null;
  pickupTimeFrom: string | null;
  pickupTimeTo: string | null;
  deliveryCompany: string | null;
  deliveryLocation: string;
  deliveryContactName: string | null;
  deliveryPhone: string | null;
  deliveryEmail: string | null;
  deliveryDate: string | null;
  deliveryTimeFrom: string | null;
  deliveryTimeTo: string | null;
  cargoWeightTon: number | null;
  cargoVolumeM3: number | null;
  packageCount: number | null;
  temperatureGroup: TemperatureGroup;
  temperatureLabel: string;
  vehicleRequirement: string;
  listedPriceVnd: number;
  cargoImages: { id: string }[];
  status: ShipmentStatus;
  statusLabel: string;
  carrierId: string | null;
  vehicleId: string | null;
  driverId: string | null;
  vehicleLabel: string | null;
  driverName: string | null;
  pickupConfirmedAt: string | null;
  deliveryConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Có điểm GPS hiển thị được (đã nhận ping từ tài xế). */
  hasGpsUpdate: boolean;
};

const statusLabels: Record<ShipmentStatus, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đang tìm xe",
  MATCHED: "Đã có nhà xe nhận chuyến",
  PICKUP_CONFIRMED: "Đã xác nhận lấy hàng",
  IN_TRANSIT: "Đang vận chuyển",
  DELIVERY_CONFIRMED: "Đã xác nhận giao hàng",
  COMPLETED: "Hoàn tất",
  INCIDENT: "Có sự cố",
  CANCELLED: "Đã hủy",
};

export type ShipmentRecord = {
  _id: { toString(): string };
  shipperId: { toString(): string };
  cargoDescription: string;
  pickupCompany?: string | null;
  pickupLocation: string;
  pickupContactName?: string | null;
  pickupPhone?: string | null;
  pickupEmail?: string | null;
  pickupDate?: string | null;
  pickupTimeFrom?: string | null;
  pickupTimeTo?: string | null;
  deliveryCompany?: string | null;
  deliveryLocation: string;
  deliveryContactName?: string | null;
  deliveryPhone?: string | null;
  deliveryEmail?: string | null;
  deliveryDate?: string | null;
  deliveryTimeFrom?: string | null;
  deliveryTimeTo?: string | null;
  cargoWeightTon?: number | null;
  cargoVolumeM3?: number | null;
  packageCount?: number | null;
  temperatureGroup: TemperatureGroup;
  vehicleRequirement: string;
  listedPriceVnd: number;
  cargoImageIds?: { toString(): string }[] | null;
  status: ShipmentStatus;
  carrierId?: { toString(): string } | null;
  vehicleId?: { toString(): string } | null;
  driverId?: { toString(): string } | null;
  pickupConfirmedAt?: Date | null;
  deliveryConfirmedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  latestLocation?: StoredLocation | null;
};

function instantOrNull(value: Date | null | undefined): string | null {
  return value instanceof Date ? value.toISOString() : null;
}

function idOrNull(value: { toString(): string } | null | undefined): string | null {
  return value ? value.toString() : null;
}

function textOrNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function numberOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function shipmentStatusLabel(status: ShipmentStatus, assigned: boolean): string {
  return status === "MATCHED" && assigned ? "Chờ lấy hàng" : statusLabels[status];
}

export function toShipmentDto(
  shipment: ShipmentRecord,
  names?: { vehicleLabel: string | null; driverName: string | null },
): ShipmentDto {
  const vehicleId = idOrNull(shipment.vehicleId);
  const driverId = idOrNull(shipment.driverId);
  const assigned = vehicleId !== null && driverId !== null;
  return {
    id: shipment._id.toString(),
    shipperId: shipment.shipperId.toString(),
    cargoDescription: shipment.cargoDescription,
    pickupCompany: textOrNull(shipment.pickupCompany),
    pickupLocation: shipment.pickupLocation,
    pickupContactName: textOrNull(shipment.pickupContactName),
    pickupPhone: textOrNull(shipment.pickupPhone),
    pickupEmail: textOrNull(shipment.pickupEmail),
    pickupDate: textOrNull(shipment.pickupDate),
    pickupTimeFrom: textOrNull(shipment.pickupTimeFrom),
    pickupTimeTo: textOrNull(shipment.pickupTimeTo),
    deliveryCompany: textOrNull(shipment.deliveryCompany),
    deliveryLocation: shipment.deliveryLocation,
    deliveryContactName: textOrNull(shipment.deliveryContactName),
    deliveryPhone: textOrNull(shipment.deliveryPhone),
    deliveryEmail: textOrNull(shipment.deliveryEmail),
    deliveryDate: textOrNull(shipment.deliveryDate),
    deliveryTimeFrom: textOrNull(shipment.deliveryTimeFrom),
    deliveryTimeTo: textOrNull(shipment.deliveryTimeTo),
    cargoWeightTon: numberOrNull(shipment.cargoWeightTon),
    cargoVolumeM3: numberOrNull(shipment.cargoVolumeM3),
    packageCount: numberOrNull(shipment.packageCount),
    temperatureGroup: shipment.temperatureGroup,
    temperatureLabel: temperatureLabels[shipment.temperatureGroup],
    vehicleRequirement: shipment.vehicleRequirement,
    listedPriceVnd: shipment.listedPriceVnd,
    cargoImages: (shipment.cargoImageIds ?? []).map((id) => ({ id: id.toString() })),
    status: shipment.status,
    statusLabel: shipmentStatusLabel(shipment.status, assigned),
    carrierId: idOrNull(shipment.carrierId),
    vehicleId,
    driverId,
    vehicleLabel: names?.vehicleLabel ?? null,
    driverName: names?.driverName ?? null,
    pickupConfirmedAt: instantOrNull(shipment.pickupConfirmedAt),
    deliveryConfirmedAt: instantOrNull(shipment.deliveryConfirmedAt),
    createdAt: shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt.toISOString(),
    hasGpsUpdate: toTrackingDto(shipment.status, shipment.latestLocation).location !== null,
  };
}

export type CarrierShipmentDto = {
  id: string;
  cargoDescription: string;
  pickupCompany: string | null;
  pickupLocation: string;
  pickupContactName: string | null;
  pickupPhone: string | null;
  pickupDate: string | null;
  pickupTimeFrom: string | null;
  pickupTimeTo: string | null;
  deliveryCompany: string | null;
  deliveryLocation: string;
  deliveryContactName: string | null;
  deliveryPhone: string | null;
  deliveryDate: string | null;
  deliveryTimeFrom: string | null;
  deliveryTimeTo: string | null;
  cargoWeightTon: number | null;
  cargoVolumeM3: number | null;
  packageCount: number | null;
  temperatureGroup: TemperatureGroup;
  temperatureLabel: string;
  vehicleRequirement: string;
  listedPriceVnd: number;
  cargoImages: { id: string }[];
  status: ShipmentStatus;
  statusLabel: string;
  carrierId: string | null;
  vehicleId: string | null;
  driverId: string | null;
  vehicleLabel: string | null;
  driverName: string | null;
  pickupConfirmedAt: string | null;
  deliveryConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toCarrierShipmentDto(
  shipment: ShipmentRecord,
  names?: { vehicleLabel: string | null; driverName: string | null },
): CarrierShipmentDto {
  const dto = toShipmentDto(shipment, names);
  return {
    id: dto.id,
    cargoDescription: dto.cargoDescription,
    pickupCompany: dto.pickupCompany,
    pickupLocation: dto.pickupLocation,
    pickupContactName: dto.pickupContactName,
    pickupPhone: dto.pickupPhone,
    pickupDate: dto.pickupDate,
    pickupTimeFrom: dto.pickupTimeFrom,
    pickupTimeTo: dto.pickupTimeTo,
    deliveryCompany: dto.deliveryCompany,
    deliveryLocation: dto.deliveryLocation,
    deliveryContactName: dto.deliveryContactName,
    deliveryPhone: dto.deliveryPhone,
    deliveryDate: dto.deliveryDate,
    deliveryTimeFrom: dto.deliveryTimeFrom,
    deliveryTimeTo: dto.deliveryTimeTo,
    cargoWeightTon: dto.cargoWeightTon,
    cargoVolumeM3: dto.cargoVolumeM3,
    packageCount: dto.packageCount,
    temperatureGroup: dto.temperatureGroup,
    temperatureLabel: dto.temperatureLabel,
    vehicleRequirement: dto.vehicleRequirement,
    listedPriceVnd: dto.listedPriceVnd,
    cargoImages: dto.cargoImages,
    status: dto.status,
    statusLabel: dto.statusLabel,
    carrierId: dto.carrierId,
    vehicleId: dto.vehicleId,
    driverId: dto.driverId,
    vehicleLabel: dto.vehicleLabel,
    driverName: dto.driverName,
    pickupConfirmedAt: dto.pickupConfirmedAt,
    deliveryConfirmedAt: dto.deliveryConfirmedAt,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

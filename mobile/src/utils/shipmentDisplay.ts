import type { Shipment } from "../types/shipment";

/** Đơn MATCHED đã gán cả xe và tài xế (chờ tài xế lấy hàng). */
export function isCarrierAssigned(shipment: Shipment): boolean {
  return shipment.status === "MATCHED" && Boolean(shipment.vehicleId && shipment.driverId);
}

/** Đơn nhà xe đã nhận nhưng chưa gán xe/tài xế. */
export function needsCarrierAssignment(shipment: Shipment): boolean {
  return shipment.status === "MATCHED" && Boolean(shipment.carrierId) && !isCarrierAssigned(shipment);
}

export function carrierAssignmentSummary(shipment: Shipment): string | null {
  if (!isCarrierAssigned(shipment)) return null;
  const parts: string[] = [];
  if (shipment.vehicleLabel) parts.push(shipment.vehicleLabel);
  if (shipment.driverName) parts.push(shipment.driverName);
  if (parts.length === 0) return "Đã phân công xe và tài xế";
  return `Đã phân công: ${parts.join(" · ")}`;
}

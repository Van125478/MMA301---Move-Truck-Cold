import type { Shipment, ShipmentStatus } from "../types/shipment";

export type StatusFilter = "ALL" | "ACTIVE" | "DONE" | "CANCELLED";

export const statusFilters: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "ACTIVE", label: "Đang xử lý" },
  { key: "DONE", label: "Hoàn tất" },
  { key: "CANCELLED", label: "Đã hủy" },
];

const doneStatuses: ReadonlySet<ShipmentStatus> = new Set(["DELIVERY_CONFIRMED", "COMPLETED"]);

function matchesStatus(status: ShipmentStatus, filter: StatusFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "CANCELLED") return status === "CANCELLED";
  if (filter === "DONE") return doneStatuses.has(status);
  return status !== "CANCELLED" && !doneStatuses.has(status);
}

/** Bỏ dấu + chữ thường để tìm không phân biệt dấu. */
function fold(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

export function filterShipments(shipments: Shipment[], query: string, filter: StatusFilter): Shipment[] {
  const q = fold(query.trim());
  return shipments.filter((s) => {
    if (!matchesStatus(s.status, filter)) return false;
    if (!q) return true;
    const haystack = fold([s.cargoDescription, s.pickupLocation, s.deliveryLocation, s.pickupCompany, s.deliveryCompany, s.statusLabel, s.id].filter(Boolean).join(" "));
    return haystack.includes(q);
  });
}

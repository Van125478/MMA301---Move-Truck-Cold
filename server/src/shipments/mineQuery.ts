import { HttpError } from "../middlewares/errorHandler.js";
import { shipmentStatuses, temperatureGroups, type ShipmentStatus, type TemperatureGroup } from "../models/shipment.js";

export const MINE_MAX_LIMIT = 50;

export type MineQuery = {
  statuses: ShipmentStatus[] | null;
  temperatureGroup: TemperatureGroup | null;
  search: string | null;
  /** null = không phân trang (giữ hành vi cũ: trả toàn bộ). */
  paging: { page: number; limit: number } | null;
};

function single(value: unknown): string | null {
  if (value === undefined) return null;
  if (typeof value !== "string") throw new HttpError(400, "invalid_request", "Tham số lọc đơn chưa hợp lệ.");
  return value;
}

function positiveInt(value: string | null, name: string, max: number): number | null {
  if (value === null) return null;
  if (!/^\d{1,6}$/.test(value)) throw new HttpError(400, "invalid_request", `Tham số ${name} chưa hợp lệ.`);
  const parsed = Number(value);
  if (parsed < 1 || parsed > max) throw new HttpError(400, "invalid_request", `Tham số ${name} chưa hợp lệ.`);
  return parsed;
}

export function readMineQuery(query: Record<string, unknown>): MineQuery {
  const rawStatuses = single(query.statuses);
  let statuses: ShipmentStatus[] | null = null;
  if (rawStatuses !== null && rawStatuses.trim() !== "") {
    const parts = rawStatuses.split(",").map((part) => part.trim());
    if (!parts.every((part) => (shipmentStatuses as readonly string[]).includes(part))) {
      throw new HttpError(400, "invalid_request", "Trạng thái đơn cần lọc chưa hợp lệ.");
    }
    statuses = [...new Set(parts)] as ShipmentStatus[];
  }

  const rawGroup = single(query.temperatureGroup);
  let temperatureGroup: TemperatureGroup | null = null;
  if (rawGroup !== null && rawGroup !== "") {
    if (!(temperatureGroups as readonly string[]).includes(rawGroup)) {
      throw new HttpError(400, "invalid_request", "Nhóm nhiệt cần lọc chưa hợp lệ.");
    }
    temperatureGroup = rawGroup as TemperatureGroup;
  }

  const rawSearch = single(query.q)?.trim() ?? "";
  if (rawSearch.length > 100) throw new HttpError(400, "invalid_request", "Từ khóa tìm kiếm quá dài.");

  const limit = positiveInt(single(query.limit), "limit", MINE_MAX_LIMIT);
  const page = positiveInt(single(query.page), "page", 100000);
  return {
    statuses,
    temperatureGroup,
    search: rawSearch === "" ? null : rawSearch,
    paging: limit === null ? null : { page: page ?? 1, limit },
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function mineFilter(shipperId: string, parsed: MineQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = { shipperId };
  if (parsed.statuses) filter.status = { $in: parsed.statuses };
  if (parsed.temperatureGroup) filter.temperatureGroup = parsed.temperatureGroup;
  if (parsed.search) {
    const pattern = new RegExp(escapeRegex(parsed.search), "i");
    filter.$or = [
      { cargoDescription: pattern },
      { pickupLocation: pattern },
      { deliveryLocation: pattern },
      { vehicleRequirement: pattern },
    ];
  }
  return filter;
}

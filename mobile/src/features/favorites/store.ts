import AsyncStorage from "@react-native-async-storage/async-storage";
import { shipmentStatuses, temperatureGroups, type Shipment, type ShipmentStatus, type TemperatureGroup } from "../../types/shipment";

export type FavoriteRecord = {
  id: string;
  cargoDescription: string;
  pickupLocation: string;
  deliveryLocation: string;
  pickupDate: string | null;
  pickupTimeFrom: string | null;
  pickupTimeTo: string | null;
  temperatureGroup: TemperatureGroup;
  temperatureLabel: string;
  status: ShipmentStatus;
  statusLabel: string;
  listedPriceVnd: number;
  savedAt: string;
};

function keyFor(userId: string): string {
  return `coldi.favorites.${userId}`;
}

/** Khách chưa đăng nhập — lưu yêu thích trên máy, tách key tài khoản. */
export const GUEST_FAVORITES_USER_ID = "__guest__";

export function favoriteFrom(shipment: Shipment): FavoriteRecord {
  return {
    id: shipment.id,
    cargoDescription: shipment.cargoDescription,
    pickupLocation: shipment.pickupLocation,
    deliveryLocation: shipment.deliveryLocation,
    pickupDate: shipment.pickupDate,
    pickupTimeFrom: shipment.pickupTimeFrom,
    pickupTimeTo: shipment.pickupTimeTo,
    temperatureGroup: shipment.temperatureGroup,
    temperatureLabel: shipment.temperatureLabel,
    status: shipment.status,
    statusLabel: shipment.statusLabel,
    listedPriceVnd: shipment.listedPriceVnd,
    savedAt: new Date().toISOString(),
  };
}

export function upsertFavorite(items: readonly FavoriteRecord[], next: FavoriteRecord): FavoriteRecord[] {
  return [next, ...items.filter((item) => item.id !== next.id)];
}

export function withoutFavorite(items: readonly FavoriteRecord[], id: string): FavoriteRecord[] {
  return items.filter((item) => item.id !== id);
}

export function withoutFavorites(items: readonly FavoriteRecord[], ids: ReadonlySet<string>): FavoriteRecord[] {
  if (ids.size === 0) return [...items];
  return items.filter((item) => !ids.has(item.id));
}

function parseList(raw: string | null): FavoriteRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const items: FavoriteRecord[] = [];
    for (const value of parsed) {
      if (typeof value !== "object" || value === null) continue;
      const row = value as Record<string, unknown>;
      if (typeof row.id !== "string" || row.id.length === 0 || seen.has(row.id)) continue;
      if (typeof row.cargoDescription !== "string" || typeof row.pickupLocation !== "string" || typeof row.deliveryLocation !== "string") {
        continue;
      }
      if (typeof row.listedPriceVnd !== "number") continue;
      const status = typeof row.status === "string" && shipmentStatuses.includes(row.status as ShipmentStatus) ? (row.status as ShipmentStatus) : "PUBLISHED";
      const temperatureLabel = typeof row.temperatureLabel === "string" ? row.temperatureLabel : "";
      const storedGroup = typeof row.temperatureGroup === "string" ? row.temperatureGroup : "";
      const temperatureGroup: TemperatureGroup = temperatureGroups.includes(storedGroup as TemperatureGroup)
        ? (storedGroup as TemperatureGroup)
        : temperatureLabel.includes("Cực lạnh")
          ? "DEEP_FROZEN"
          : temperatureLabel.includes("Đông")
            ? "FROZEN"
            : "COOL";
      seen.add(row.id);
      items.push({
        id: row.id,
        cargoDescription: row.cargoDescription,
        pickupLocation: row.pickupLocation,
        deliveryLocation: row.deliveryLocation,
        pickupDate: typeof row.pickupDate === "string" ? row.pickupDate : null,
        pickupTimeFrom: typeof row.pickupTimeFrom === "string" ? row.pickupTimeFrom : null,
        pickupTimeTo: typeof row.pickupTimeTo === "string" ? row.pickupTimeTo : null,
        temperatureGroup,
        temperatureLabel,
        status,
        statusLabel: typeof row.statusLabel === "string" ? row.statusLabel : "",
        listedPriceVnd: row.listedPriceVnd,
        savedAt: typeof row.savedAt === "string" ? row.savedAt : new Date().toISOString(),
      });
    }
    return items;
  } catch {
    return [];
  }
}

export async function readFavorites(userId: string): Promise<FavoriteRecord[]> {
  return parseList(await AsyncStorage.getItem(keyFor(userId)));
}

export async function writeFavorites(userId: string, items: readonly FavoriteRecord[]): Promise<void> {
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(items));
}

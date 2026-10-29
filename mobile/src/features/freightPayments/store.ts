import AsyncStorage from "@react-native-async-storage/async-storage";

export type FreightPaymentMethod = "CASH" | "TRANSFER";

export type FreightPaymentRecord = {
  shipmentId: string;
  method: FreightPaymentMethod;
  paidAt: string;
  amountVnd: number;
};

export const freightPaymentMethodLabel: Record<FreightPaymentMethod, string> = {
  CASH: "Tiền mặt",
  TRANSFER: "Chuyển khoản",
};

function keyFor(userId: string): string {
  return `coldi.freightPayments.${userId}`;
}

function parseList(raw: string | null): FreightPaymentRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((row) => {
      if (typeof row !== "object" || row === null) return [];
      const item = row as Record<string, unknown>;
      if (typeof item.shipmentId !== "string") return [];
      const method = item.method;
      if (method !== "CASH" && method !== "TRANSFER") return [];
      if (typeof item.paidAt !== "string") return [];
      if (typeof item.amountVnd !== "number" || !Number.isFinite(item.amountVnd)) return [];
      return [{ shipmentId: item.shipmentId, method, paidAt: item.paidAt, amountVnd: item.amountVnd }];
    });
  } catch {
    return [];
  }
}

export async function readFreightPayments(userId: string): Promise<FreightPaymentRecord[]> {
  return parseList(await AsyncStorage.getItem(keyFor(userId)));
}

export async function writeFreightPayments(userId: string, items: readonly FreightPaymentRecord[]): Promise<void> {
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(items));
}

export async function recordFreightPayment(userId: string, record: FreightPaymentRecord): Promise<FreightPaymentRecord[]> {
  const items = await readFreightPayments(userId);
  const next = [record, ...items.filter((row) => row.shipmentId !== record.shipmentId)];
  await writeFreightPayments(userId, next);
  return next;
}

export function paymentByShipment(items: readonly FreightPaymentRecord[]): Map<string, FreightPaymentRecord> {
  return new Map(items.map((row) => [row.shipmentId, row]));
}

import { ApiError } from "../api/client";
import { reportDriverLocation } from "../api/shipments";
import { readDeviceFix } from "./deviceFix";

const SHARE_EVERY_MS = 60_000;

let timer: ReturnType<typeof setInterval> | null = null;
let activeShipmentId: string | null = null;
let startedAt = 0;

export function liveShareShipmentId(): string | null {
  return activeShipmentId;
}

export function liveShareStartedAt(): number {
  return startedAt;
}

/** Bắt đầu gửi vị trí và giữ cho đến khi gọi stopLiveShare. Không có nút tắt trên app. */
export function startLiveShare(shipmentId: string): void {
  if (activeShipmentId === shipmentId && timer) return;
  clearTimer();
  activeShipmentId = shipmentId;
  startedAt = Date.now();
  void ping(shipmentId);
  timer = setInterval(() => {
    if (activeShipmentId) void ping(activeShipmentId);
  }, SHARE_EVERY_MS);
}

export function stopLiveShare(): void {
  clearTimer();
  activeShipmentId = null;
  startedAt = 0;
}

async function ping(shipmentId: string): Promise<void> {
  try {
    const fix = await readDeviceFix();
    if (activeShipmentId !== shipmentId) return;
    await reportDriverLocation(shipmentId, fix);
  } catch (caught) {
    if (caught instanceof ApiError && (caught.status === 409 || caught.status === 404)) {
      if (activeShipmentId === shipmentId) stopLiveShare();
    }
  }
}

function clearTimer(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

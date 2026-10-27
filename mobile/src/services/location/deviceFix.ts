import * as Location from "expo-location";

export type DeviceFix = {
  latitude: number;
  longitude: number;
  speedKmh: number | null;
  bearingDeg: number | null;
  observedAt: string;
};

export async function readDeviceFix(): Promise<DeviceFix> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("Chưa được phép đọc vị trí. Hãy bật định vị cho Coldi rồi thử lại.");
  }
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const speed = position.coords.speed;
  const heading = position.coords.heading;
  const speedKmh = speed != null && speed >= 0 ? Math.min(300, Math.round(speed * 3.6 * 10) / 10) : null;
  const bearingDeg = heading != null && heading >= 0 && heading <= 360 ? heading : null;
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    speedKmh,
    bearingDeg,
    observedAt: new Date(position.timestamp).toISOString(),
  };
}

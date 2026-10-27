import type { PublishBody } from "../../services/api/shipments";
import type { TemperatureGroup } from "../../types/shipment";

export type OrderDraft = {
  cargoDescription: string;
  pickupCompany: string;
  pickupLocation: string;
  pickupContactName: string;
  pickupPhone: string;
  pickupEmail: string;
  pickupDate: string;
  pickupTimeFrom: string;
  pickupTimeTo: string;
  deliveryCompany: string;
  deliveryLocation: string;
  deliveryContactName: string;
  deliveryPhone: string;
  deliveryEmail: string;
  deliveryDate: string;
  deliveryTimeFrom: string;
  deliveryTimeTo: string;
  cargoWeightTon: string;
  cargoVolumeM3: string;
  packageCount: string;
  temperatureGroup: TemperatureGroup | "";
  vehicleRequirement: string;
  listedPriceVnd: string;
};

export const emptyDraft: OrderDraft = {
  cargoDescription: "",
  pickupCompany: "",
  pickupLocation: "",
  pickupContactName: "",
  pickupPhone: "",
  pickupEmail: "",
  pickupDate: "",
  pickupTimeFrom: "",
  pickupTimeTo: "",
  deliveryCompany: "",
  deliveryLocation: "",
  deliveryContactName: "",
  deliveryPhone: "",
  deliveryEmail: "",
  deliveryDate: "",
  deliveryTimeFrom: "",
  deliveryTimeTo: "",
  cargoWeightTon: "",
  cargoVolumeM3: "",
  packageCount: "",
  temperatureGroup: "",
  vehicleRequirement: "",
  listedPriceVnd: "",
};

const stepOf: Record<string, 1 | 2 | 3> = {
  pickupCompany: 1,
  pickupLocation: 1,
  pickupContactName: 1,
  pickupPhone: 1,
  pickupEmail: 1,
  pickupDate: 1,
  pickupTimeFrom: 1,
  pickupTimeTo: 1,
  deliveryCompany: 2,
  deliveryLocation: 2,
  deliveryContactName: 2,
  deliveryPhone: 2,
  deliveryEmail: 2,
  deliveryDate: 2,
  deliveryTimeFrom: 2,
  deliveryTimeTo: 2,
};

function text(value: string, max: number): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}

function phone(value: string): string | null {
  const trimmed = text(value, 20);
  if (!trimmed || trimmed.length < 8) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return trimmed;
}

function optionalEmail(value: string): string | null | undefined {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return undefined;
  return trimmed;
}

function calendarDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return value;
}

function clock(value: string): string | null {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;
}

function measure(raw: string): number | null {
  const value = Number(raw.trim().replace(",", "."));
  if (!Number.isFinite(value) || value <= 0 || value > 100000) return null;
  const scaled = Math.round(value * 1000);
  if (Math.abs(value * 1000 - scaled) > 1e-6) return null;
  return scaled / 1000;
}

export function validateOrder(draft: OrderDraft): { ok: true; body: PublishBody } | { ok: false; fields: Record<string, string>; step: 1 | 2 | 3 } {
  const fields: Record<string, string> = {};
  const cargoDescription = text(draft.cargoDescription, 300);
  const pickupCompany = text(draft.pickupCompany, 160);
  const pickupLocation = text(draft.pickupLocation, 300);
  const pickupContactName = text(draft.pickupContactName, 160);
  const pickupPhone = phone(draft.pickupPhone);
  const pickupEmail = optionalEmail(draft.pickupEmail);
  const pickupDate = calendarDate(draft.pickupDate.trim());
  const pickupTimeFrom = clock(draft.pickupTimeFrom.trim());
  const pickupTimeTo = clock(draft.pickupTimeTo.trim());
  const deliveryCompany = text(draft.deliveryCompany, 160);
  const deliveryLocation = text(draft.deliveryLocation, 300);
  const deliveryContactName = text(draft.deliveryContactName, 160);
  const deliveryPhone = phone(draft.deliveryPhone);
  const deliveryEmail = optionalEmail(draft.deliveryEmail);
  const deliveryDate = calendarDate(draft.deliveryDate.trim());
  const deliveryTimeFrom = clock(draft.deliveryTimeFrom.trim());
  const deliveryTimeTo = clock(draft.deliveryTimeTo.trim());
  const cargoWeightTon = measure(draft.cargoWeightTon);
  const cargoVolumeM3 = measure(draft.cargoVolumeM3);
  const packageCount = Number(draft.packageCount.trim());
  const packageOk = Number.isSafeInteger(packageCount) && packageCount >= 1 && packageCount <= 1000000;
  const vehicleRequirement = text(draft.vehicleRequirement, 160);
  const priceDigits = draft.listedPriceVnd.replace(/\D/g, "");
  const listedPriceVnd = Number(priceDigits);
  const priceOk = priceDigits.length > 0 && Number.isSafeInteger(listedPriceVnd) && listedPriceVnd >= 1;
  const temperatureGroup = draft.temperatureGroup;

  if (!cargoDescription) fields.cargoDescription = "Nhập mô tả hàng hóa.";
  if (!pickupCompany) fields.pickupCompany = "Nhập tên công ty hoặc kho gửi.";
  if (!pickupLocation) fields.pickupLocation = "Nhập địa chỉ lấy hàng.";
  if (!pickupContactName) fields.pickupContactName = "Nhập người bốc hàng.";
  if (!pickupPhone) fields.pickupPhone = "Nhập số điện thoại lấy hàng.";
  if (pickupEmail === undefined) fields.pickupEmail = "Email nhận thông báo chưa hợp lệ.";
  if (!pickupDate) fields.pickupDate = "Chọn ngày lấy hàng hợp lệ.";
  if (!draft.pickupTimeFrom.trim()) fields.pickupTimeFrom = "Chọn giờ bắt đầu bốc hàng.";
  else if (!pickupTimeFrom) fields.pickupTimeFrom = "Giờ bắt đầu bốc hàng chưa hợp lệ.";
  if (!draft.pickupTimeTo.trim()) fields.pickupTimeTo = "Chọn giờ kết thúc bốc hàng.";
  else if (!pickupTimeTo) fields.pickupTimeTo = "Giờ kết thúc bốc hàng chưa hợp lệ.";
  if (pickupTimeFrom && pickupTimeTo && pickupTimeFrom >= pickupTimeTo) fields.pickupTimeTo = "Giờ kết thúc bốc hàng phải muộn hơn giờ bắt đầu.";
  if (!deliveryCompany) fields.deliveryCompany = "Nhập tên công ty hoặc kho nhận.";
  if (!deliveryLocation) fields.deliveryLocation = "Nhập địa chỉ giao hàng.";
  if (!deliveryContactName) fields.deliveryContactName = "Nhập người nhận hàng.";
  if (!deliveryPhone) fields.deliveryPhone = "Nhập số điện thoại giao hàng.";
  if (deliveryEmail === undefined) fields.deliveryEmail = "Email kho nhận chưa hợp lệ.";
  if (!deliveryDate) fields.deliveryDate = "Chọn ngày giao hàng hợp lệ.";
  if (pickupDate && deliveryDate && deliveryDate < pickupDate) fields.deliveryDate = "Ngày giao muộn nhất không được trước ngày lấy hàng.";
  if (!draft.deliveryTimeFrom.trim()) fields.deliveryTimeFrom = "Chọn giờ bắt đầu nhận hàng.";
  else if (!deliveryTimeFrom) fields.deliveryTimeFrom = "Giờ bắt đầu nhận hàng chưa hợp lệ.";
  if (!draft.deliveryTimeTo.trim()) fields.deliveryTimeTo = "Chọn giờ kết thúc nhận hàng.";
  else if (!deliveryTimeTo) fields.deliveryTimeTo = "Giờ kết thúc nhận hàng chưa hợp lệ.";
  if (deliveryTimeFrom && deliveryTimeTo && deliveryTimeFrom >= deliveryTimeTo) {
    fields.deliveryTimeTo = "Giờ kết thúc nhận hàng phải muộn hơn giờ bắt đầu.";
  }
  if (cargoWeightTon === null) fields.cargoWeightTon = "Nhập trọng lượng bằng tấn, lớn hơn 0.";
  if (cargoVolumeM3 === null) fields.cargoVolumeM3 = "Nhập thể tích bằng mét khối, lớn hơn 0.";
  if (!packageOk) fields.packageCount = "Nhập số thùng bằng số nguyên, lớn hơn 0.";
  if (!temperatureGroup) fields.temperatureGroup = "Chọn nhóm nhiệt Lạnh mát, Đông hoặc Cực lạnh.";
  if (!vehicleRequirement) fields.vehicleRequirement = "Nhập yêu cầu xe.";
  if (!priceOk) fields.listedPriceVnd = "Nhập giá cước niêm yết bằng số nguyên đồng, lớn hơn 0.";

  const keys = Object.keys(fields);
  if (
    keys.length > 0 ||
    !cargoDescription ||
    !pickupCompany ||
    !pickupLocation ||
    !pickupContactName ||
    !pickupPhone ||
    pickupEmail === undefined ||
    !pickupDate ||
    !pickupTimeFrom ||
    !pickupTimeTo ||
    !deliveryCompany ||
    !deliveryLocation ||
    !deliveryContactName ||
    !deliveryPhone ||
    deliveryEmail === undefined ||
    !deliveryDate ||
    !deliveryTimeFrom ||
    !deliveryTimeTo ||
    cargoWeightTon === null ||
    cargoVolumeM3 === null ||
    !packageOk ||
    !temperatureGroup ||
    !vehicleRequirement ||
    !priceOk
  ) {
    const step = keys.reduce<1 | 2 | 3>((current, key) => Math.min(current, stepOf[key] ?? 3) as 1 | 2 | 3, 3);
    return { ok: false, fields, step };
  }

  return {
    ok: true,
    body: {
      cargoDescription,
      pickupCompany,
      pickupLocation,
      pickupContactName,
      pickupPhone,
      pickupEmail,
      pickupDate,
      pickupTimeFrom,
      pickupTimeTo,
      deliveryCompany,
      deliveryLocation,
      deliveryContactName,
      deliveryPhone,
      deliveryEmail,
      deliveryDate,
      deliveryTimeFrom,
      deliveryTimeTo,
      cargoWeightTon,
      cargoVolumeM3,
      packageCount,
      temperatureGroup,
      vehicleRequirement,
      listedPriceVnd,
      cargoImageIds: [],
    },
  };
}

export function stepFields(step: 1 | 2 | 3, fields: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(fields).filter(([key]) => (stepOf[key] ?? 3) === step));
}

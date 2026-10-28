import type { TemperatureGroup } from "../../types/shipment";

export type NewShipmentDraft = {
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
  temperatureGroup: TemperatureGroup | null;
  vehicleRequirement: string;
  listedPriceVnd: string;
  cargoImageIds: string[];
};

export const emptyShipmentDraft: NewShipmentDraft = {
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
  temperatureGroup: null,
  vehicleRequirement: "",
  listedPriceVnd: "",
  cargoImageIds: [],
};

export type ShipmentDraftFieldErrors = Partial<Record<keyof NewShipmentDraft, string>>;

export type PublishPayload = {
  cargoDescription: string;
  pickupCompany: string;
  pickupLocation: string;
  pickupContactName: string;
  pickupPhone: string;
  pickupEmail: string | null;
  pickupDate: string;
  pickupTimeFrom: string;
  pickupTimeTo: string;
  deliveryCompany: string;
  deliveryLocation: string;
  deliveryContactName: string;
  deliveryPhone: string;
  deliveryEmail: string | null;
  deliveryDate: string;
  deliveryTimeFrom: string;
  deliveryTimeTo: string;
  cargoWeightTon: number;
  cargoVolumeM3: number;
  packageCount: number;
  temperatureGroup: TemperatureGroup;
  vehicleRequirement: string;
  listedPriceVnd: number;
  cargoImageIds: string[];
};

const CALENDAR_RE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CARGO_IMAGE_MIN = 1;
export const CARGO_IMAGE_MAX = 5;

function trimmed(value: string): string {
  return value.trim();
}

/** True if a whole-tsan/m3 number has at most 3 decimal places, matching the server's `measure()` rule. */
function hasValidMeasureScale(value: number): boolean {
  const scaled = Math.round(value * 1000);
  return Math.abs(value * 1000 - scaled) <= 1e-6;
}

function parseCalendarDate(value: string): boolean {
  if (!CALENDAR_RE.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validatePhone(value: string): boolean {
  const text = trimmed(value);
  if (text.length < 8 || text.length > 20) return false;
  const digits = text.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

/**
 * Mirrors server/src/shipments/publishInput.ts so a user sees the same complaint locally,
 * before spending a round trip to the API. Server validation remains authoritative.
 */
export function validateShipmentDraft(draft: NewShipmentDraft): ShipmentDraftFieldErrors {
  const errors: ShipmentDraftFieldErrors = {};

  if (trimmed(draft.cargoDescription).length === 0) errors.cargoDescription = "Nhập mô tả hàng hóa.";
  else if (draft.cargoDescription.length > 300) errors.cargoDescription = "Mô tả hàng hóa tối đa 300 ký tự.";

  if (trimmed(draft.pickupCompany).length === 0) errors.pickupCompany = "Nhập tên công ty hoặc kho gửi.";
  else if (draft.pickupCompany.length > 160) errors.pickupCompany = "Tên công ty gửi tối đa 160 ký tự.";

  if (trimmed(draft.pickupLocation).length === 0) errors.pickupLocation = "Nhập địa chỉ lấy hàng.";
  else if (draft.pickupLocation.length > 300) errors.pickupLocation = "Địa chỉ lấy hàng tối đa 300 ký tự.";

  if (trimmed(draft.pickupContactName).length === 0) errors.pickupContactName = "Nhập người bốc hàng.";
  else if (draft.pickupContactName.length > 160) errors.pickupContactName = "Tên người bốc hàng tối đa 160 ký tự.";

  if (trimmed(draft.pickupPhone).length === 0) errors.pickupPhone = "Nhập số điện thoại lấy hàng.";
  else if (!validatePhone(draft.pickupPhone)) errors.pickupPhone = "Số điện thoại lấy hàng chưa hợp lệ.";

  if (trimmed(draft.pickupEmail).length > 0 && !EMAIL_RE.test(trimmed(draft.pickupEmail).toLowerCase())) {
    errors.pickupEmail = "Email nhận thông báo chưa hợp lệ.";
  }

  if (trimmed(draft.pickupDate).length === 0) errors.pickupDate = "Chọn ngày lấy hàng.";
  else if (!parseCalendarDate(draft.pickupDate)) errors.pickupDate = "Chọn ngày lấy hàng hợp lệ.";

  if (trimmed(draft.pickupTimeFrom).length === 0) errors.pickupTimeFrom = "Chọn giờ bắt đầu bốc hàng.";
  else if (!CLOCK_RE.test(draft.pickupTimeFrom)) errors.pickupTimeFrom = "Giờ bắt đầu bốc hàng chưa hợp lệ.";

  if (trimmed(draft.pickupTimeTo).length === 0) errors.pickupTimeTo = "Chọn giờ kết thúc bốc hàng.";
  else if (!CLOCK_RE.test(draft.pickupTimeTo)) errors.pickupTimeTo = "Giờ kết thúc bốc hàng chưa hợp lệ.";
  else if (CLOCK_RE.test(draft.pickupTimeFrom) && draft.pickupTimeFrom >= draft.pickupTimeTo) {
    errors.pickupTimeTo = "Giờ kết thúc bốc hàng phải muộn hơn giờ bắt đầu.";
  }

  if (trimmed(draft.deliveryCompany).length === 0) errors.deliveryCompany = "Nhập tên công ty hoặc kho nhận.";
  else if (draft.deliveryCompany.length > 160) errors.deliveryCompany = "Tên công ty nhận tối đa 160 ký tự.";

  if (trimmed(draft.deliveryLocation).length === 0) errors.deliveryLocation = "Nhập địa chỉ giao hàng.";
  else if (draft.deliveryLocation.length > 300) errors.deliveryLocation = "Địa chỉ giao hàng tối đa 300 ký tự.";

  if (trimmed(draft.deliveryContactName).length === 0) errors.deliveryContactName = "Nhập người nhận hàng.";
  else if (draft.deliveryContactName.length > 160) errors.deliveryContactName = "Tên người nhận hàng tối đa 160 ký tự.";

  if (trimmed(draft.deliveryPhone).length === 0) errors.deliveryPhone = "Nhập số điện thoại giao hàng.";
  else if (!validatePhone(draft.deliveryPhone)) errors.deliveryPhone = "Số điện thoại giao hàng chưa hợp lệ.";

  if (trimmed(draft.deliveryEmail).length > 0 && !EMAIL_RE.test(trimmed(draft.deliveryEmail).toLowerCase())) {
    errors.deliveryEmail = "Email kho nhận chưa hợp lệ.";
  }

  if (trimmed(draft.deliveryDate).length === 0) errors.deliveryDate = "Chọn ngày giao hàng.";
  else if (!parseCalendarDate(draft.deliveryDate)) errors.deliveryDate = "Chọn ngày giao hàng hợp lệ.";
  else if (parseCalendarDate(draft.pickupDate) && draft.deliveryDate < draft.pickupDate) {
    errors.deliveryDate = "Ngày giao muộn nhất không được trước ngày lấy hàng.";
  }

  if (trimmed(draft.deliveryTimeFrom).length === 0) errors.deliveryTimeFrom = "Chọn giờ bắt đầu nhận hàng.";
  else if (!CLOCK_RE.test(draft.deliveryTimeFrom)) errors.deliveryTimeFrom = "Giờ bắt đầu nhận hàng chưa hợp lệ.";

  if (trimmed(draft.deliveryTimeTo).length === 0) errors.deliveryTimeTo = "Chọn giờ kết thúc nhận hàng.";
  else if (!CLOCK_RE.test(draft.deliveryTimeTo)) errors.deliveryTimeTo = "Giờ kết thúc nhận hàng chưa hợp lệ.";
  else if (CLOCK_RE.test(draft.deliveryTimeFrom) && draft.deliveryTimeFrom >= draft.deliveryTimeTo) {
    errors.deliveryTimeTo = "Giờ kết thúc nhận hàng phải muộn hơn giờ bắt đầu.";
  }

  const weight = Number(draft.cargoWeightTon.replace(",", "."));
  if (trimmed(draft.cargoWeightTon).length === 0 || !Number.isFinite(weight) || weight <= 0 || weight > 100000 || !hasValidMeasureScale(weight)) {
    errors.cargoWeightTon = "Nhập trọng lượng bằng tấn, lớn hơn 0.";
  }

  const volume = Number(draft.cargoVolumeM3.replace(",", "."));
  if (trimmed(draft.cargoVolumeM3).length === 0 || !Number.isFinite(volume) || volume <= 0 || volume > 100000 || !hasValidMeasureScale(volume)) {
    errors.cargoVolumeM3 = "Nhập thể tích bằng mét khối, lớn hơn 0.";
  }

  const packageCount = Number(draft.packageCount);
  if (
    trimmed(draft.packageCount).length === 0 ||
    !Number.isSafeInteger(packageCount) ||
    packageCount < 1 ||
    packageCount > 1000000 ||
    !/^\d+$/.test(trimmed(draft.packageCount))
  ) {
    errors.packageCount = "Nhập số thùng bằng số nguyên, lớn hơn 0.";
  }

  if (!draft.temperatureGroup) errors.temperatureGroup = "Chọn nhóm nhiệt Lạnh mát, Đông hoặc Cực lạnh.";

  if (trimmed(draft.vehicleRequirement).length === 0) errors.vehicleRequirement = "Nhập yêu cầu xe.";
  else if (draft.vehicleRequirement.length > 160) errors.vehicleRequirement = "Yêu cầu xe tối đa 160 ký tự.";

  const price = Number(draft.listedPriceVnd);
  if (
    trimmed(draft.listedPriceVnd).length === 0 ||
    !Number.isSafeInteger(price) ||
    price < 1 ||
    !/^\d+$/.test(trimmed(draft.listedPriceVnd))
  ) {
    errors.listedPriceVnd = "Nhập giá cước niêm yết bằng số nguyên đồng, lớn hơn 0.";
  }

  if (draft.cargoImageIds.length < CARGO_IMAGE_MIN) {
    errors.cargoImageIds = `Thêm ít nhất ${CARGO_IMAGE_MIN} ảnh hàng hóa.`;
  } else if (draft.cargoImageIds.length > CARGO_IMAGE_MAX) {
    errors.cargoImageIds = `Chỉ thêm tối đa ${CARGO_IMAGE_MAX} ảnh hàng hóa.`;
  }

  return errors;
}

export function isDraftValid(draft: NewShipmentDraft): boolean {
  return Object.keys(validateShipmentDraft(draft)).length === 0;
}

/** Only call after validateShipmentDraft() returns no errors — this trusts the draft is well-formed. */
export function toPublishPayload(draft: NewShipmentDraft): PublishPayload {
  return {
    cargoDescription: trimmed(draft.cargoDescription),
    pickupCompany: trimmed(draft.pickupCompany),
    pickupLocation: trimmed(draft.pickupLocation),
    pickupContactName: trimmed(draft.pickupContactName),
    pickupPhone: trimmed(draft.pickupPhone),
    pickupEmail: trimmed(draft.pickupEmail).length > 0 ? trimmed(draft.pickupEmail).toLowerCase() : null,
    pickupDate: draft.pickupDate,
    pickupTimeFrom: draft.pickupTimeFrom,
    pickupTimeTo: draft.pickupTimeTo,
    deliveryCompany: trimmed(draft.deliveryCompany),
    deliveryLocation: trimmed(draft.deliveryLocation),
    deliveryContactName: trimmed(draft.deliveryContactName),
    deliveryPhone: trimmed(draft.deliveryPhone),
    deliveryEmail: trimmed(draft.deliveryEmail).length > 0 ? trimmed(draft.deliveryEmail).toLowerCase() : null,
    deliveryDate: draft.deliveryDate,
    deliveryTimeFrom: draft.deliveryTimeFrom,
    deliveryTimeTo: draft.deliveryTimeTo,
    cargoWeightTon: Number(draft.cargoWeightTon.replace(",", ".")),
    cargoVolumeM3: Number(draft.cargoVolumeM3.replace(",", ".")),
    packageCount: Number(draft.packageCount),
    temperatureGroup: draft.temperatureGroup as TemperatureGroup,
    vehicleRequirement: trimmed(draft.vehicleRequirement),
    listedPriceVnd: Number(draft.listedPriceVnd),
    cargoImageIds: draft.cargoImageIds,
  };
}

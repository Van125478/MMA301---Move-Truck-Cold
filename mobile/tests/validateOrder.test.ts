import assert from "node:assert/strict";
import test from "node:test";
import { emptyDraft, stepFields, validateOrder, type OrderDraft } from "../src/features/shipments/validateOrder";

function iso(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

const valid = (): OrderDraft => ({
  ...emptyDraft,
  cargoDescription: "Xoài cát",
  pickupCompany: "Kho A",
  pickupLocation: "Cái Bè",
  pickupContactName: "Hùng",
  pickupPhone: "0908123456",
  pickupDate: iso(1),
  pickupTimeFrom: "08:00",
  pickupTimeTo: "11:00",
  deliveryCompany: "Kho B",
  deliveryLocation: "Thủ Đức",
  deliveryContactName: "Tuấn",
  deliveryPhone: "0912889999",
  deliveryDate: iso(2),
  deliveryTimeFrom: "14:00",
  deliveryTimeTo: "18:00",
  cargoWeightTon: "2,5",
  cargoVolumeM3: "12",
  packageCount: "180",
  temperatureGroup: "COOL",
  vehicleRequirement: "Xe lạnh 5 tấn",
  listedPriceVnd: "4500000",
});

function failure(draft: OrderDraft) {
  const result = validateOrder(draft);
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("unreachable");
  return result;
}

test("a complete draft becomes a typed publish body", () => {
  const result = validateOrder(valid());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.body.cargoWeightTon, 2.5);
  assert.equal(result.body.listedPriceVnd, 4500000);
  assert.equal(result.body.pickupEmail, null);
  assert.equal(Object.keys(result.body).length, 23);
});

test("empty draft reports errors and points at step 1", () => {
  const result = failure(emptyDraft);
  assert.equal(result.step, 1);
  assert.ok(result.fields.pickupCompany && result.fields.deliveryCompany && result.fields.listedPriceVnd);
});

test("past dates are rejected", () => {
  assert.match(failure({ ...valid(), pickupDate: iso(-1) }).fields.pickupDate ?? "", /quá khứ/);
  assert.match(failure({ ...valid(), deliveryDate: iso(-1) }).fields.deliveryDate ?? "", /quá khứ/);
  assert.equal(validateOrder({ ...valid(), pickupDate: iso(0), deliveryDate: iso(0) }).ok, true);
});

test("delivery may not be before pickup, and time ranges must be ordered", () => {
  const early = failure({ ...valid(), pickupDate: iso(3), deliveryDate: iso(2) });
  assert.match(early.fields.deliveryDate ?? "", /không được trước/);
  assert.equal(early.step, 2);
  assert.ok(failure({ ...valid(), pickupTimeFrom: "11:00", pickupTimeTo: "08:00" }).fields.pickupTimeTo);
  assert.ok(failure({ ...valid(), deliveryTimeFrom: "25:00" }).fields.deliveryTimeFrom);
});

test("numbers, phone and email follow the server rules", () => {
  assert.ok(failure({ ...valid(), cargoWeightTon: "0" }).fields.cargoWeightTon);
  assert.ok(failure({ ...valid(), cargoWeightTon: "1.2345" }).fields.cargoWeightTon);
  assert.ok(failure({ ...valid(), packageCount: "1.5" }).fields.packageCount);
  assert.ok(failure({ ...valid(), listedPriceVnd: "" }).fields.listedPriceVnd);
  assert.ok(failure({ ...valid(), pickupPhone: "123" }).fields.pickupPhone);
  assert.ok(failure({ ...valid(), pickupEmail: "not-an-email" }).fields.pickupEmail);
  assert.ok(failure({ ...valid(), temperatureGroup: "" }).fields.temperatureGroup);
  const ok = validateOrder({ ...valid(), pickupEmail: " A@B.COM " });
  assert.equal(ok.ok && ok.body.pickupEmail, "a@b.com");
});

test("stepFields keeps only the errors of the requested step", () => {
  const fields = { pickupPhone: "x", deliveryDate: "y", listedPriceVnd: "z" };
  assert.deepEqual(Object.keys(stepFields(1, fields)), ["pickupPhone"]);
  assert.deepEqual(Object.keys(stepFields(2, fields)), ["deliveryDate"]);
  assert.deepEqual(Object.keys(stepFields(3, fields)), ["listedPriceVnd"]);
});

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import test, { before, after } from "node:test";
import mongoose from "mongoose";
import { hashPassword } from "../src/auth/password.js";
import { AuditLog } from "../src/models/auditLog.js";
import { FreightPayment } from "../src/models/freightPayment.js";
import { Shipment } from "../src/models/shipment.js";
import { User } from "../src/models/user.js";

process.env.PORT ??= "4000";
process.env.FRONTEND_ORIGIN ??= "http://127.0.0.1:5173";
process.env.NODE_ENV = "test";
process.env.AUTH_SECRET ??= "test-secret-that-is-at-least-32-characters";

const sourceUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/coldi";
const testUri = new URL(sourceUri);
testUri.pathname = "/coldi_freight_payment_test";
process.env.MONGODB_URI = testUri.toString();

const { createApp } = await import("../src/app.js");

const password = "test-password-123";
const shipperEmail = "shipper.freight-test@coldi.local";
const otherShipperEmail = "other-shipper.freight-test@coldi.local";
const carrierEmail = "carrier.freight-test@coldi.local";
const otherCarrierEmail = "other-carrier.freight-test@coldi.local";
const driverEmail = "driver.freight-test@coldi.local";
const adminEmail = "admin.freight-test@coldi.local";

type Json = Record<string, unknown>;

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const server = createServer(createApp());
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Test server did not bind.");
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

async function login(baseUrl: string, email: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://127.0.0.1:5173" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith("coldi_session="));
  assert.ok(cookie);
  return cookie.split(";")[0] ?? "";
}

function headers(cookie: string): HeadersInit {
  return { "content-type": "application/json", origin: "http://127.0.0.1:5173", cookie };
}

async function deliveredShipment(cargoDescription: string, listedPriceVnd = 6_800_000) {
  const shipper = await User.findOne({ email: shipperEmail });
  const carrier = await User.findOne({ email: carrierEmail });
  const driver = await User.findOne({ email: driverEmail });
  assert.ok(shipper && carrier && driver);
  return Shipment.create({
    shipperId: shipper._id,
    carrierId: carrier._id,
    driverId: driver._id,
    cargoDescription,
    pickupLocation: "Đồng Nai",
    deliveryLocation: "TP. Hồ Chí Minh",
    temperatureGroup: "COOL",
    vehicleRequirement: "Xe lạnh",
    listedPriceVnd,
    status: "DELIVERY_CONFIRMED",
    deliveryConfirmedAt: new Date(),
    deliveryConfirmedBy: driver._id,
  });
}

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI ?? "");
  if (mongoose.connection.name !== "coldi_freight_payment_test") {
    throw new Error(`Refusing to use database ${mongoose.connection.name}.`);
  }
  await mongoose.connection.dropDatabase();
  await FreightPayment.init();
  const passwordHash = await hashPassword(password);
  const carrier = await User.create({ email: carrierEmail, passwordHash, role: "CARRIER", displayName: "Nhà xe cước" });
  await User.create([
    { email: shipperEmail, passwordHash, role: "SHIPPER", displayName: "Chủ hàng cước" },
    { email: otherShipperEmail, passwordHash, role: "SHIPPER", displayName: "Chủ hàng khác" },
    { email: otherCarrierEmail, passwordHash, role: "CARRIER", displayName: "Nhà xe khác" },
    { email: driverEmail, passwordHash, role: "DRIVER", carrierId: carrier._id, displayName: "Tài xế cước" },
    { email: adminEmail, passwordHash, role: "ADMIN", displayName: "Quản trị cước" },
  ]);
});

after(async () => {
  if (mongoose.connection.name === "coldi_freight_payment_test") await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test("shipper records the listed freight and the carrier confirms receipt without a platform charge", async () => {
  await withServer(async (baseUrl) => {
    const shipment = await deliveredShipment("Sữa chua đã giao để trả cước");
    const id = shipment._id.toString();
    const shipper = await login(baseUrl, shipperEmail);
    const carrier = await login(baseUrl, carrierEmail);
    const driver = await login(baseUrl, driverEmail);

    const unpaid = await fetch(`${baseUrl}/api/freight-payments/${id}`, { headers: headers(shipper) });
    const unpaidBody = (await unpaid.json()) as { payment: Json };
    assert.equal(unpaid.status, 200);
    assert.equal(unpaidBody.payment.status, "UNPAID");
    assert.equal(unpaidBody.payment.amountVnd, 6_800_000);
    assert.equal(unpaidBody.payment.platformCollected, false);

    const recorded = await fetch(`${baseUrl}/api/freight-payments/${id}`, {
      method: "POST",
      headers: headers(shipper),
      body: JSON.stringify({ method: "BANK_TRANSFER", reference: "FT123456" }),
    });
    const recordedBody = (await recorded.json()) as { payment: Json };
    assert.equal(recorded.status, 201);
    assert.equal(recordedBody.payment.status, "RECORDED");
    assert.equal(recordedBody.payment.method, "BANK_TRANSFER");
    assert.equal(recordedBody.payment.reference, "FT123456");
    assert.equal(recordedBody.payment.amountVnd, 6_800_000);
    assert.equal(recordedBody.payment.platformCollected, false);

    const replay = await fetch(`${baseUrl}/api/freight-payments/${id}`, {
      method: "POST",
      headers: headers(shipper),
      body: JSON.stringify({ method: "BANK_TRANSFER", reference: "FT123456" }),
    });
    assert.equal(replay.status, 200);

    const driverRead = await fetch(`${baseUrl}/api/freight-payments/${id}`, { headers: headers(driver) });
    assert.equal(driverRead.status, 200);

    const confirmed = await fetch(`${baseUrl}/api/freight-payments/${id}/confirm`, {
      method: "POST",
      headers: headers(carrier),
      body: JSON.stringify({}),
    });
    const confirmedBody = (await confirmed.json()) as { payment: Json };
    assert.equal(confirmed.status, 200);
    assert.equal(confirmedBody.payment.status, "CONFIRMED");
    assert.equal(confirmedBody.payment.platformCollected, false);

    const storedShipment = await Shipment.findById(id);
    assert.equal(storedShipment?.status, "DELIVERY_CONFIRMED");
    assert.equal(storedShipment?.commission, undefined);
    const storedPayment = await FreightPayment.findOne({ shipmentId: id });
    assert.equal(storedPayment?.platformCollected, false);
    assert.equal(storedPayment?.amountVnd, 6_800_000);
    assert.equal(await AuditLog.countDocuments({ action: "FREIGHT_PAYMENT_RECORDED", resourceId: id }), 1);
    assert.equal(await AuditLog.countDocuments({ action: "FREIGHT_PAYMENT_CONFIRMED", resourceId: id }), 1);

    const payments = await fetch(`${baseUrl}/api/payments`, { headers: headers(carrier) });
    assert.equal(payments.status, 404);
  });
});

test("freight cannot be recorded before delivery and outsiders cannot see it", async () => {
  await withServer(async (baseUrl) => {
    const shipperUser = await User.findOne({ email: shipperEmail });
    assert.ok(shipperUser);
    const open = await Shipment.create({
      shipperId: shipperUser._id,
      cargoDescription: "Đơn còn đang tìm xe",
      pickupLocation: "Cần Thơ",
      deliveryLocation: "Đà Lạt",
      temperatureGroup: "FROZEN",
      vehicleRequirement: "Xe đông lạnh",
      listedPriceVnd: 4_000_000,
      status: "PUBLISHED",
    });
    const shipper = await login(baseUrl, shipperEmail);
    const other = await login(baseUrl, otherShipperEmail);
    const admin = await login(baseUrl, adminEmail);
    const tooSoon = await fetch(`${baseUrl}/api/freight-payments/${open._id.toString()}`, {
      method: "POST",
      headers: headers(shipper),
      body: JSON.stringify({ method: "CASH" }),
    });
    const tooSoonBody = (await tooSoon.json()) as { error: { code: string } };
    assert.equal(tooSoon.status, 409);
    assert.equal(tooSoonBody.error.code, "freight_not_open");

    const delivered = await deliveredShipment("Đơn cách ly thanh toán");
    const hidden = await fetch(`${baseUrl}/api/freight-payments/${delivered._id.toString()}`, { headers: headers(other) });
    assert.equal(hidden.status, 404);
    const adminHidden = await fetch(`${baseUrl}/api/freight-payments/${delivered._id.toString()}`, { headers: headers(admin) });
    assert.equal(adminHidden.status, 404);
    const missing = await fetch(`${baseUrl}/api/freight-payments/not-an-id`, { headers: headers(shipper) });
    assert.equal(missing.status, 404);
    const anonymous = await fetch(`${baseUrl}/api/freight-payments/${delivered._id.toString()}`);
    assert.equal(anonymous.status, 401);
  });
});

test("only the owning shipper records and only the owning carrier confirms", async () => {
  await withServer(async (baseUrl) => {
    const shipment = await deliveredShipment("Đơn phân quyền thanh toán");
    const id = shipment._id.toString();
    const shipper = await login(baseUrl, shipperEmail);
    const carrier = await login(baseUrl, carrierEmail);
    const otherCarrier = await login(baseUrl, otherCarrierEmail);
    const driver = await login(baseUrl, driverEmail);

    const driverRecord = await fetch(`${baseUrl}/api/freight-payments/${id}`, {
      method: "POST",
      headers: headers(driver),
      body: JSON.stringify({ method: "CASH" }),
    });
    assert.equal(driverRecord.status, 403);
    const carrierRecord = await fetch(`${baseUrl}/api/freight-payments/${id}`, {
      method: "POST",
      headers: headers(carrier),
      body: JSON.stringify({ method: "CASH" }),
    });
    assert.equal(carrierRecord.status, 403);

    const badReference = await fetch(`${baseUrl}/api/freight-payments/${id}`, {
      method: "POST",
      headers: headers(shipper),
      body: JSON.stringify({ method: "BANK_TRANSFER" }),
    });
    assert.equal(badReference.status, 400);
    const extra = await fetch(`${baseUrl}/api/freight-payments/${id}`, {
      method: "POST",
      headers: headers(shipper),
      body: JSON.stringify({ method: "CASH", amountVnd: 1 }),
    });
    assert.equal(extra.status, 400);

    const recorded = await fetch(`${baseUrl}/api/freight-payments/${id}`, {
      method: "POST",
      headers: headers(shipper),
      body: JSON.stringify({ method: "CASH" }),
    });
    assert.equal(recorded.status, 201);
    const conflict = await fetch(`${baseUrl}/api/freight-payments/${id}`, {
      method: "POST",
      headers: headers(shipper),
      body: JSON.stringify({ method: "BANK_TRANSFER", reference: "KHAC1" }),
    });
    assert.equal(conflict.status, 409);

    const shipperConfirm = await fetch(`${baseUrl}/api/freight-payments/${id}/confirm`, {
      method: "POST",
      headers: headers(shipper),
      body: JSON.stringify({}),
    });
    assert.equal(shipperConfirm.status, 403);
    const strangerConfirm = await fetch(`${baseUrl}/api/freight-payments/${id}/confirm`, {
      method: "POST",
      headers: headers(otherCarrier),
      body: JSON.stringify({}),
    });
    assert.equal(strangerConfirm.status, 404);
    const driverConfirm = await fetch(`${baseUrl}/api/freight-payments/${id}/confirm`, {
      method: "POST",
      headers: headers(driver),
      body: JSON.stringify({}),
    });
    assert.equal(driverConfirm.status, 403);
    const confirmed = await fetch(`${baseUrl}/api/freight-payments/${id}/confirm`, {
      method: "POST",
      headers: headers(carrier),
      body: JSON.stringify({}),
    });
    assert.equal(confirmed.status, 200);
    const again = await fetch(`${baseUrl}/api/freight-payments/${id}/confirm`, {
      method: "POST",
      headers: headers(carrier),
      body: JSON.stringify({}),
    });
    assert.equal(again.status, 409);
    assert.equal(await FreightPayment.countDocuments({ shipmentId: id }), 1);
  });
});

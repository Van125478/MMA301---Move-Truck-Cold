import { withRequiredCargoImage } from "./support/cargoImage.js";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import test, { before, after } from "node:test";
import mongoose from "mongoose";
import { hashPassword } from "../src/auth/password.js";
import { AuditLog } from "../src/models/auditLog.js";
import { Shipment } from "../src/models/shipment.js";
import { User } from "../src/models/user.js";

process.env.PORT ??= "4000";
process.env.FRONTEND_ORIGIN ??= "http://127.0.0.1:5173";
process.env.NODE_ENV = "test";
process.env.AUTH_SECRET ??= "test-secret-that-is-at-least-32-characters";

const sourceUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/coldi";
const testUri = new URL(sourceUri);
testUri.pathname = "/coldi_marketplace_test";
process.env.MONGODB_URI = testUri.toString();

const { createApp } = await import("../src/app.js");

const password = "test-password-123";
const shipperEmail = "shipper.marketplace-test@coldi.local";
const carrierEmail = "carrier.marketplace-test@coldi.local";
const otherCarrierEmail = "other-carrier.marketplace-test@coldi.local";
const driverEmail = "driver.marketplace-test@coldi.local";
const adminEmail = "admin.marketplace-test@coldi.local";
const privateEmail = "rieng-email-c13@coldi.local";

type Json = Record<string, unknown>;

const baseOrder = {
  pickupCompany: "Kho kiểm tra",
  pickupContactName: "Người lấy",
  pickupPhone: "0908123456",
  pickupEmail: privateEmail,
  pickupTimeFrom: "08:00",
  pickupTimeTo: "11:30",
  deliveryCompany: "Kho giao",
  deliveryContactName: "Người nhận",
  deliveryPhone: "0912889999",
  deliveryTimeFrom: "14:00",
  deliveryTimeTo: "18:00",
  cargoVolumeM3: 4,
  packageCount: 12,
  vehicleRequirement: "Xe đông lạnh 8 tấn",
};

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

function headers(cookie?: string) {
  return {
    "content-type": "application/json",
    origin: "http://127.0.0.1:5173",
    ...(cookie ? { cookie } : {}),
  };
}

async function publish(baseUrl: string, cookie: string, order: Json) {
  const response = await fetch(`${baseUrl}/api/shipments`, {
    method: "POST",
    headers: headers(cookie),
    body: JSON.stringify(await withRequiredCargoImage(baseUrl, cookie, { ...baseOrder, ...order })),
  });
  assert.equal(response.status, 201);
  const body = (await response.json()) as { shipment: Json };
  return body.shipment;
}

async function board(baseUrl: string, cookie: string, query = "") {
  const response = await fetch(`${baseUrl}/api/carrier/shipments${query}`, { headers: headers(cookie) });
  const body = (await response.json()) as { shipments?: Json[]; error?: { message?: string } };
  return { response, body };
}

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI ?? "");
  if (mongoose.connection.name !== "coldi_marketplace_test") {
    throw new Error(`Refusing to use database ${mongoose.connection.name}.`);
  }
  await mongoose.connection.dropDatabase();
  const passwordHash = await hashPassword(password);
  await User.create([
    { email: shipperEmail, passwordHash, role: "SHIPPER", displayName: "Chủ hàng sàn" },
    { email: carrierEmail, passwordHash, role: "CARRIER", displayName: "Nhà xe sàn" },
    { email: otherCarrierEmail, passwordHash, role: "CARRIER", displayName: "Nhà xe khác" },
    { email: driverEmail, passwordHash, role: "DRIVER", displayName: "Tài xế sàn" },
    { email: adminEmail, passwordHash, role: "ADMIN", displayName: "Quản trị sàn" },
  ]);
});

after(async () => {
  await mongoose.disconnect();
});

test("the load board lists only published shipments and honors allowed filters", async () => {
  await withServer(async (baseUrl) => {
    const shipper = await login(baseUrl, shipperEmail);
    const carrier = await login(baseUrl, carrierEmail);
    const cool = await publish(baseUrl, shipper, {
      cargoDescription: "Thủy sản C13",
      pickupLocation: "Cái Bè, Tiền Giang",
      deliveryLocation: "Thủ Đức, TP. Hồ Chí Minh",
      temperatureGroup: "COOL",
      listedPriceVnd: 4_000_000,
      pickupDate: "2026-11-02",
      deliveryDate: "2026-11-03",
      cargoWeightTon: 1.5,
    });
    const frozen = await publish(baseUrl, shipper, {
      cargoDescription: "Thịt đông C13",
      pickupLocation: "Long An",
      deliveryLocation: "Bình Dương",
      temperatureGroup: "FROZEN",
      listedPriceVnd: 9_000_000,
      pickupDate: "2026-11-10",
      deliveryDate: "2026-11-11",
      cargoWeightTon: 8,
    });
    const samePriceEarly = await publish(baseUrl, shipper, {
      cargoDescription: "Hàng giá bằng sớm",
      pickupLocation: "Mỹ Tho",
      deliveryLocation: "Biên Hòa",
      temperatureGroup: "FROZEN",
      listedPriceVnd: 5_000_000,
      pickupDate: "2026-11-01",
      deliveryDate: "2026-11-02",
      cargoWeightTon: 3,
    });
    const samePriceLate = await publish(baseUrl, shipper, {
      cargoDescription: "Hàng giá bằng muộn",
      pickupLocation: "Mỹ Tho",
      deliveryLocation: "Biên Hòa",
      temperatureGroup: "FROZEN",
      listedPriceVnd: 5_000_000,
      pickupDate: "2026-11-20",
      deliveryDate: "2026-11-21",
      cargoWeightTon: 3,
    });
    const shipperUser = await User.findOne({ email: shipperEmail });
    const driverUser = await User.findOne({ email: driverEmail });
    assert.ok(shipperUser && driverUser);
    const missing = await Shipment.create({
      shipperId: shipperUser._id,
      cargoDescription: "Hàng thiếu số liệu C13",
      pickupLocation: "Bến Tre",
      deliveryLocation: "Đồng Nai",
      temperatureGroup: "DEEP_FROZEN",
      vehicleRequirement: "Xe lạnh",
      listedPriceVnd: 2_000_000,
      status: "PUBLISHED",
      pickupEmail: privateEmail,
      latestLocation: {
        latitude: 10.1234,
        longitude: 106.5678,
        observedAt: new Date(),
        receivedAt: new Date(),
        driverId: driverUser._id,
      },
    });

    const open = await board(baseUrl, carrier);
    assert.equal(open.response.status, 200);
    const ids = (open.body.shipments ?? []).map((item) => String(item.id));
    assert.ok(ids.includes(String(cool.id)));
    assert.ok(ids.includes(String(frozen.id)));
    assert.ok(ids.includes(String(missing._id)));
    const serialized = JSON.stringify(open.body);
    assert.equal(serialized.includes(privateEmail), false);
    assert.equal(serialized.includes("shipperId"), false);
    assert.equal(serialized.includes("latitude"), false);
    assert.equal(serialized.includes("longitude"), false);
    assert.equal(serialized.includes("passwordHash"), false);
    assert.equal(serialized.includes("latestLocation"), false);
    const sparse = (open.body.shipments ?? []).find((item) => item.id === String(missing._id));
    assert.equal(sparse?.cargoWeightTon ?? null, null);
    assert.equal(sparse?.listedPriceVnd, 2_000_000);

    const beforeEvents = (await Shipment.findById(cool.id))?.events?.length ?? 0;
    const beforeAudits = await AuditLog.countDocuments();
    const reread = await board(baseUrl, carrier);
    assert.equal(reread.response.status, 200);
    assert.equal((await Shipment.findById(cool.id))?.events?.length ?? 0, beforeEvents);
    assert.equal((await Shipment.findById(cool.id))?.status, "PUBLISHED");
    assert.equal(await AuditLog.countDocuments(), beforeAudits);

    const byName = await board(baseUrl, carrier, "?q=%20th%E1%BB%A7y%20s%E1%BA%A3n%20c13%20");
    assert.deepEqual((byName.body.shipments ?? []).map((item) => item.id), [cool.id]);
    const accent = await board(baseUrl, carrier, "?q=thuy%20san%20c13");
    assert.equal(accent.body.shipments?.length, 0);
    const byRoute = await board(baseUrl, carrier, "?pickup=C%C3%A1i%20B%C3%A8");
    assert.deepEqual((byRoute.body.shipments ?? []).map((item) => item.id), [cool.id]);

    const coolOnly = await board(baseUrl, carrier, "?temperature=COOL");
    assert.deepEqual((coolOnly.body.shipments ?? []).map((item) => item.id), [cool.id]);
    const heavy = await board(baseUrl, carrier, "?weightMin=4");
    assert.deepEqual((heavy.body.shipments ?? []).map((item) => item.id), [frozen.id]);
    const dated = await board(baseUrl, carrier, "?pickupFrom=2026-11-09&pickupTo=2026-11-12");
    assert.deepEqual((dated.body.shipments ?? []).map((item) => item.id), [frozen.id]);

    const newest = await board(baseUrl, carrier, "?q=H%C3%A0ng%20gi%C3%A1%20b%E1%BA%B1ng&sort=newest");
    assert.deepEqual((newest.body.shipments ?? []).map((item) => item.id), [samePriceLate.id, samePriceEarly.id]);
    const byPrice = await board(baseUrl, carrier, "?sort=price&temperature=FROZEN");
    const priceIds = (byPrice.body.shipments ?? []).map((item) => String(item.id));
    assert.deepEqual(priceIds.slice(0, 2), [String(samePriceEarly.id), String(samePriceLate.id)].sort());
    assert.equal(priceIds.at(-1), String(frozen.id));

    assert.equal((await board(baseUrl, carrier, "?temperature=WARM")).response.status, 400);
    assert.equal((await board(baseUrl, carrier, "?tenantId=abc")).response.status, 400);
    assert.equal((await board(baseUrl, carrier, "?weightMin=9&weightMax=1")).response.status, 400);
    assert.equal((await board(baseUrl, carrier, "?sort=nearest")).response.status, 400);

    for (const email of [driverEmail, adminEmail, shipperEmail]) {
      const denied = await board(baseUrl, await login(baseUrl, email));
      assert.equal(denied.response.status, 403);
    }
    const guest = await fetch(`${baseUrl}/api/carrier/shipments`);
    assert.equal(guest.status, 401);
    const driverClaim = await fetch(`${baseUrl}/api/carrier/shipments/${String(cool.id)}/claim`, {
      method: "POST",
      headers: headers(await login(baseUrl, driverEmail)),
      body: JSON.stringify({}),
    });
    assert.equal(driverClaim.status, 403);
    assert.equal((await Shipment.findById(cool.id))?.status, "PUBLISHED");
  });
});

test("public marketplace browse needs no auth and hides contact fields", async () => {
  await withServer(async (baseUrl) => {
    const created = await publish(baseUrl, await login(baseUrl, shipperEmail), {
      cargoDescription: "Hàng công khai C13",
      pickupLocation: "Long An",
      deliveryLocation: "Bình Dương",
      temperatureGroup: "COOL",
      listedPriceVnd: 4_500_000,
      pickupDate: "2026-12-10",
      deliveryDate: "2026-12-11",
      cargoWeightTon: 3,
    });
    const response = await fetch(`${baseUrl}/api/marketplace/shipments?q=${encodeURIComponent("Hàng công khai")}`);
    assert.equal(response.status, 200);
    const body = (await response.json()) as { shipments?: Json[] };
    const row = body.shipments?.find((item) => String(item.id) === String(created.id));
    assert.ok(row);
    assert.equal(row.pickupPhone, null);
    assert.equal(row.pickupEmail, null);
    assert.equal(row.deliveryPhone, null);
  });
});

test("chat and an unknown bookmark route do not claim a shipment", async () => {
  await withServer(async (baseUrl) => {
    const created = await publish(baseUrl, await login(baseUrl, shipperEmail), {
      cargoDescription: "Hàng giữ chỗ C13",
      pickupLocation: "Cần Thơ",
      deliveryLocation: "Đồng Nai",
      temperatureGroup: "COOL",
      listedPriceVnd: 3_000_000,
      pickupDate: "2026-12-01",
      deliveryDate: "2026-12-02",
      cargoWeightTon: 2,
    });
    const id = String(created.id);
    const carrier = await login(baseUrl, carrierEmail);
    const chat = await fetch(`${baseUrl}/api/carrier/conversations/by-shipment/${id}`, {
      method: "POST",
      headers: headers(carrier),
      body: JSON.stringify({}),
    });
    assert.equal(chat.status, 200);
    const bookmark = await fetch(`${baseUrl}/api/carrier/shipments/${id}/bookmark`, {
      method: "POST",
      headers: headers(carrier),
      body: JSON.stringify({}),
    });
    assert.equal(bookmark.status, 404);
    const stored = await Shipment.findById(id);
    assert.equal(stored?.status, "PUBLISHED");
    assert.equal(stored?.carrierId ?? null, null);
    assert.equal(stored?.events?.some((event) => event.type === "CLAIMED") ?? false, false);
  });
});

test("two carriers still produce one claim and the winner leaves the board", async () => {
  await withServer(async (baseUrl) => {
    const created = await publish(baseUrl, await login(baseUrl, shipperEmail), {
      cargoDescription: "Hàng tranh chấp C13",
      pickupLocation: "Tiền Giang",
      deliveryLocation: "Bình Dương",
      temperatureGroup: "FROZEN",
      listedPriceVnd: 7_000_000,
      pickupDate: "2026-12-05",
      deliveryDate: "2026-12-06",
      cargoWeightTon: 6,
    });
    const id = String(created.id);
    const [first, second] = await Promise.all([
      fetch(`${baseUrl}/api/carrier/shipments/${id}/claim`, {
        method: "POST",
        headers: headers(await login(baseUrl, carrierEmail)),
        body: JSON.stringify({}),
      }),
      fetch(`${baseUrl}/api/carrier/shipments/${id}/claim`, {
        method: "POST",
        headers: headers(await login(baseUrl, otherCarrierEmail)),
        body: JSON.stringify({}),
      }),
    ]);
    const statuses = [first.status, second.status].sort((left, right) => left - right);
    assert.deepEqual(statuses, [200, 409]);
    const winner = first.status === 200 ? first : second;
    const loser = first.status === 200 ? second : first;
    const won = (await winner.json()) as { shipment: Json };
    const lost = (await loser.json()) as { error?: { code?: string } };
    assert.equal(won.shipment.status, "MATCHED");
    assert.equal(lost.error?.code, "conflict");
    assert.equal(await AuditLog.countDocuments({ action: "SHIPMENT_CLAIMED", resourceId: id, outcome: "success" }), 1);
    const listed = await board(baseUrl, await login(baseUrl, carrierEmail), `?q=${encodeURIComponent("Hàng tranh chấp C13")}`);
    assert.equal(listed.body.shipments?.length, 0);
  });
});

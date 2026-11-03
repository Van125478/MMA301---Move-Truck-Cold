import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import test, { before, after } from "node:test";
import mongoose from "mongoose";
import { hashPassword } from "../src/auth/password.js";
import { withRequiredCargoImage } from "./support/cargoImage.js";
import { Shipment } from "../src/models/shipment.js";
import { User } from "../src/models/user.js";

process.env.PORT ??= "4000";
process.env.FRONTEND_ORIGIN ??= "http://127.0.0.1:5173";
process.env.NODE_ENV = "test";
process.env.AUTH_SECRET ??= "test-secret-that-is-at-least-32-characters";

const sourceUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/coldi";
const testUri = new URL(sourceUri);
testUri.pathname = "/coldi_mine_test";
process.env.MONGODB_URI = testUri.toString();

const { createApp } = await import("../src/app.js");

const password = "test-password-123";
const shipperEmail = "shipper.mine-test@coldi.local";
const otherShipperEmail = "other.mine-test@coldi.local";
const carrierEmail = "carrier.mine-test@coldi.local";
const driverEmail = "driver.mine-test@coldi.local";
const adminEmail = "admin.mine-test@coldi.local";

const validBody = {
  cargoDescription: "Xoài cát Hòa Lộc",
  pickupCompany: "Kho Cái Bè",
  pickupLocation: "Cái Bè, Tiền Giang",
  pickupContactName: "Nguyễn Văn Hùng",
  pickupPhone: "0908123456",
  pickupEmail: "logistics@example.com",
  pickupDate: "2026-10-22",
  pickupTimeFrom: "08:00",
  pickupTimeTo: "11:30",
  deliveryCompany: "Kho Thủ Đức",
  deliveryLocation: "Thủ Đức, TP. Hồ Chí Minh",
  deliveryContactName: "Trần Minh Tuấn",
  deliveryPhone: "0912889999",
  deliveryDate: "2026-10-23",
  deliveryTimeFrom: "14:00",
  deliveryTimeTo: "18:00",
  cargoWeightTon: 2.5,
  cargoVolumeM3: 12,
  packageCount: 180,
  temperatureGroup: "COOL",
  vehicleRequirement: "Xe lạnh 5 tấn",
  listedPriceVnd: 4500000,
};

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

async function publish(baseUrl: string, cookie: string | null, body: unknown, origin = "http://127.0.0.1:5173") {
  return fetch(`${baseUrl}/api/shipments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(await withRequiredCargoImage(baseUrl, cookie, body)),
  });
}


before(async () => {
  await mongoose.connect(process.env.MONGODB_URI ?? "");
  if (mongoose.connection.name !== "coldi_mine_test") {
    throw new Error(`Refusing to use database ${mongoose.connection.name}.`);
  }
  await mongoose.connection.dropDatabase();
  await User.create([
    { email: shipperEmail, passwordHash: await hashPassword(password), role: "SHIPPER" },
    { email: otherShipperEmail, passwordHash: await hashPassword(password), role: "SHIPPER" },
    { email: carrierEmail, passwordHash: await hashPassword(password), role: "CARRIER" },
  ]);
});

after(async () => {
  if (mongoose.connection.name === "coldi_mine_test") await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const expectedKeys = [
  "id", "shipperId", "cargoDescription", "pickupCompany", "pickupLocation", "pickupContactName", "pickupPhone", "pickupEmail",
  "pickupDate", "pickupTimeFrom", "pickupTimeTo", "deliveryCompany", "deliveryLocation", "deliveryContactName", "deliveryPhone",
  "deliveryEmail", "deliveryDate", "deliveryTimeFrom", "deliveryTimeTo", "cargoWeightTon", "cargoVolumeM3", "packageCount",
  "temperatureGroup", "temperatureLabel", "vehicleRequirement", "listedPriceVnd", "cargoImages", "status", "statusLabel", "carrierId",
  "vehicleId", "driverId", "vehicleLabel", "driverName", "pickupConfirmedAt", "deliveryConfirmedAt", "createdAt", "updatedAt",
].sort();

async function mine(baseUrl: string, cookie: string | null, query = "") {
  const response = await fetch(`${baseUrl}/api/shipments/mine${query}`, { headers: cookie ? { cookie } : {} });
  return { status: response.status, body: (await response.json()) as Json };
}

async function seed(baseUrl: string, cookie: string) {
  const specs: Array<[string, Json]> = [
    ["Xoài cát", { temperatureGroup: "COOL" }],
    ["Cá basa phi lê", { temperatureGroup: "FROZEN", deliveryLocation: "Đà Nẵng" }],
    ["Kem que", { temperatureGroup: "DEEP_FROZEN" }],
    ["Sữa tươi", { temperatureGroup: "COOL" }],
    ["Thanh long", { temperatureGroup: "COOL" }],
  ];
  const ids: string[] = [];
  for (const [cargoDescription, extra] of specs) {
    const response = await publish(baseUrl, cookie, { ...validBody, cargoDescription, ...extra });
    assert.equal(response.status, 201);
    ids.push(((await response.json()) as { shipment: { id: string } }).shipment.id);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  return ids;
}

test("GET /api/shipments/mine requires a shipper session", async () => {
  await withServer(async (baseUrl) => {
    assert.equal((await mine(baseUrl, null)).status, 401);
    assert.equal((await mine(baseUrl, await login(baseUrl, carrierEmail))).status, 403);
  });
});

test("GET /api/shipments/mine returns the documented shape, newest first, only own orders", async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl, shipperEmail);
    const ids = await seed(baseUrl, cookie);
    const other = await login(baseUrl, otherShipperEmail);
    assert.equal((await publish(baseUrl, other, validBody)).status, 201);

    const result = await mine(baseUrl, cookie);
    const shipments = result.body.shipments as Json[];
    assert.equal(result.status, 200);
    assert.equal(result.body.total, 5);
    assert.deepEqual(shipments.map((row) => row.id), [...ids].reverse());
    for (const row of shipments) {
      assert.deepEqual(Object.keys(row).sort(), expectedKeys);
      assert.equal(row.status, "PUBLISHED");
      assert.equal(row.statusLabel, "Đang tìm xe");
      assert.equal(row.carrierId, null);
      assert.equal(Array.isArray(row.cargoImages), true);
      assert.equal((row.cargoImages as unknown[]).length, 1);
      assert.equal("events" in row, false);
      assert.equal("commission" in row, false);
    }
    const times = shipments.map((row) => String(row.createdAt));
    assert.deepEqual([...times].sort().reverse(), times);
  });
});

test("GET /api/shipments/mine paginates without gaps or duplicates", async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl, shipperEmail);
    const all = ((await mine(baseUrl, cookie)).body.shipments as Json[]).map((row) => row.id);
    const first = await mine(baseUrl, cookie, "?page=1&limit=2");
    const second = await mine(baseUrl, cookie, "?page=2&limit=2");
    const third = await mine(baseUrl, cookie, "?page=3&limit=2");
    const beyond = await mine(baseUrl, cookie, "?page=4&limit=2");
    assert.deepEqual([first.body.total, first.body.page, first.body.limit, first.body.hasMore], [5, 1, 2, true]);
    assert.equal(second.body.hasMore, true);
    assert.equal(third.body.hasMore, false);
    assert.deepEqual(beyond.body.shipments, []);
    const paged = [first, second, third].flatMap((page) => (page.body.shipments as Json[]).map((row) => row.id));
    assert.deepEqual(paged, all);
  });
});

test("GET /api/shipments/mine filters by status, temperature group and keyword", async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl, shipperEmail);
    const all = (await mine(baseUrl, cookie)).body.shipments as Json[];
    const cancelId = String(all[0]?.id);
    const cancelled = await fetch(`${baseUrl}/api/shipments/${cancelId}/cancel`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://127.0.0.1:5173", cookie },
      body: "{}",
    });
    assert.equal(cancelled.status, 200);

    const byStatus = await mine(baseUrl, cookie, "?statuses=CANCELLED");
    assert.deepEqual((byStatus.body.shipments as Json[]).map((row) => row.id), [cancelId]);
    const multi = await mine(baseUrl, cookie, "?statuses=CANCELLED,PUBLISHED");
    assert.equal(multi.body.total, 5);
    const incident = await mine(baseUrl, cookie, "?statuses=INCIDENT");
    assert.deepEqual(incident.body.shipments, []);

    const frozen = await mine(baseUrl, cookie, "?temperatureGroup=FROZEN");
    assert.deepEqual((frozen.body.shipments as Json[]).map((row) => row.cargoDescription), ["Cá basa phi lê"]);

    const keyword = await mine(baseUrl, cookie, `?q=${encodeURIComponent("đà nẵng")}`);
    assert.deepEqual((keyword.body.shipments as Json[]).map((row) => row.cargoDescription), ["Cá basa phi lê"]);
    const regexChars = await mine(baseUrl, cookie, `?q=${encodeURIComponent(".*")}`);
    assert.deepEqual(regexChars.body.shipments, []);

    const combined = await mine(baseUrl, cookie, "?statuses=PUBLISHED&temperatureGroup=COOL&page=1&limit=1");
    assert.equal(combined.body.total, 2);
    assert.equal(combined.body.hasMore, true);
  });
});

test("GET /api/shipments/mine rejects malformed query values", async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl, shipperEmail);
    for (const query of ["?statuses=NOPE", "?temperatureGroup=WARM", "?limit=0", "?limit=51", "?limit=x", "?page=0&limit=5", "?q=a&q=b", `?q=${"a".repeat(101)}`]) {
      const result = await mine(baseUrl, cookie, query);
      assert.equal(result.status, 400, query);
      assert.equal((result.body.error as { code: string }).code, "invalid_request");
    }
  });
});

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import test, { before, after } from "node:test";
import mongoose from "mongoose";
import { hashPassword } from "../src/auth/password.js";
import { User } from "../src/models/user.js";

process.env.PORT ??= "4000";
process.env.FRONTEND_ORIGIN ??= "http://127.0.0.1:5173";
process.env.NODE_ENV = "test";
process.env.AUTH_SECRET ??= "test-secret-that-is-at-least-32-characters";

const sourceUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/coldi";
const testUri = new URL(sourceUri);
testUri.pathname = "/coldi_auth_test";
process.env.MONGODB_URI = testUri.toString();

const { createApp } = await import("../src/app.js");

const shipperEmail = "shipper.auth-test@coldi.local";
const carrierEmail = "carrier.auth-test@coldi.local";
const driverEmail = "driver.auth-test@coldi.local";
const adminEmail = "admin.auth-test@coldi.local";
const password = "test-password-123";

type Json = Record<string, unknown>;

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const server = createServer(createApp());
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Test server did not bind to a TCP port.");
  }
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

function sessionCookie(response: Response): string {
  const cookies = response.headers.getSetCookie();
  const cookie = cookies.find((value) => value.startsWith("coldi_session="));
  assert.ok(cookie, "expected a session cookie");
  assert.match(cookie, /httponly/i);
  assert.match(cookie, /samesite=lax/i);
  assert.match(cookie, /max-age=43200/i);
  assert.equal(cookie.toLowerCase().includes("secure"), false);
  const pair = cookie.split(";")[0] ?? "";
  return pair;
}

async function login(baseUrl: string, email: string, secret: string, extra: Json = {}): Promise<Response> {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://127.0.0.1:5173",
    },
    body: JSON.stringify({ email, password: secret, ...extra }),
  });
}

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI ?? "");
  if (mongoose.connection.name !== "coldi_auth_test") {
    throw new Error(`Refusing to use database ${mongoose.connection.name}.`);
  }
  await mongoose.connection.dropDatabase();
  await User.create([
    { email: shipperEmail, passwordHash: await hashPassword(password), role: "SHIPPER" },
    { email: carrierEmail, passwordHash: await hashPassword(password), role: "CARRIER" },
    { email: driverEmail, passwordHash: await hashPassword(password), role: "DRIVER" },
    { email: adminEmail, passwordHash: await hashPassword(password), role: "ADMIN" },
  ]);
});

after(async () => {
  if (mongoose.connection.name === "coldi_auth_test") {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});

test("login accepts the right password and hides the hash", async () => {
  await withServer(async (baseUrl) => {
    const response = await login(baseUrl, shipperEmail, password, { role: "ADMIN" });
    const body = (await response.json()) as Json;
    const user = body.user as Json;

    assert.equal(response.status, 200);
    assert.equal(user.email, shipperEmail);
    assert.equal(user.role, "SHIPPER");
    assert.equal(typeof user.id, "string");
    assert.equal("passwordHash" in user, false);
    assert.equal(JSON.stringify(body).includes(password), false);
    const stored = await User.findOne({ email: shipperEmail }).lean();
    assert.ok(stored);
    assert.notEqual(stored.passwordHash, password);
    assert.match(stored.passwordHash, /^\$2[aby]\$/);
    sessionCookie(response);
  });
});

test("login rejects an incorrect password and an unknown user with the same error", async () => {
  await withServer(async (baseUrl) => {
    const wrong = await login(baseUrl, shipperEmail, "not-the-password");
    const unknown = await login(baseUrl, "missing.auth-test@coldi.local", password);
    const wrongBody = (await wrong.json()) as Json;
    const unknownBody = (await unknown.json()) as Json;

    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(wrongBody, unknownBody);
    assert.equal((wrongBody.error as Json).code, "invalid_credentials");
    assert.equal(wrong.headers.getSetCookie().some((value) => value.startsWith("coldi_session=")), false);
  });
});

test("login rejects missing credentials", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://127.0.0.1:5173" },
      body: JSON.stringify({ email: shipperEmail }),
    });
    const body = (await response.json()) as Json;
    assert.equal(response.status, 400);
    assert.equal((body.error as Json).code, "invalid_request");
  });
});

test("me requires a session, then returns the database user", async () => {
  await withServer(async (baseUrl) => {
    const anonymous = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(anonymous.status, 401);

    const loggedIn = await login(baseUrl, shipperEmail, password);
    const cookie = sessionCookie(loggedIn);
    const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie } });
    const body = (await me.json()) as Json;
    assert.equal(me.status, 200);
    assert.equal((body.user as Json).role, "SHIPPER");
    assert.equal(JSON.stringify(body).includes("passwordHash"), false);
  });
});

test("shipper-only access rejects a carrier and allows a shipper", async () => {
  await withServer(async (baseUrl) => {
    const carrierLogin = await login(baseUrl, carrierEmail, password);
    const carrierCookie = sessionCookie(carrierLogin);
    const denied = await fetch(`${baseUrl}/api/test/shipper-only`, { headers: { cookie: carrierCookie } });
    const deniedBody = (await denied.json()) as { error: { code: string } };
    assert.equal(denied.status, 403);
    assert.equal(deniedBody.error.code, "forbidden");

    for (const email of [driverEmail, adminEmail]) {
      const otherLogin = await login(baseUrl, email, password);
      const otherDenied = await fetch(`${baseUrl}/api/test/shipper-only`, {
        headers: { cookie: sessionCookie(otherLogin) },
      });
      assert.equal(otherDenied.status, 403);
    }

    const shipperLogin = await login(baseUrl, shipperEmail, password);
    const allowed = await fetch(`${baseUrl}/api/test/shipper-only`, {
      headers: { cookie: sessionCookie(shipperLogin) },
    });
    assert.equal(allowed.status, 200);
    assert.deepEqual(await allowed.json(), { ok: true });
  });
});

test("logout clears the session", async () => {
  await withServer(async (baseUrl) => {
    const loggedIn = await login(baseUrl, shipperEmail, password);
    const cookie = sessionCookie(loggedIn);
    const logout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { cookie, origin: "http://127.0.0.1:5173" },
    });
    assert.equal(logout.status, 200);
    const cleared = logout.headers.getSetCookie().find((value) => value.startsWith("coldi_session="));
    assert.ok(cleared);
    assert.match(cleared, /1970/i);

    const browserCookie = cleared.split(";")[0] ?? "";
    const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: browserCookie } });
    assert.equal(me.status, 401);
  });
});

test("a deleted account cannot keep using an old session", async () => {
  await withServer(async (baseUrl) => {
    const loggedIn = await login(baseUrl, carrierEmail, password);
    const cookie = sessionCookie(loggedIn);
    await User.deleteOne({ email: carrierEmail });
    const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie } });
    assert.equal(me.status, 401);
    await User.create({ email: carrierEmail, passwordHash: await hashPassword(password), role: "CARRIER" });
  });
});

test("a shipper or carrier can register and receives a session", async () => {
  await withServer(async (baseUrl) => {
    const email = "new.shipper.auth-test@coldi.local";
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://127.0.0.1:5173" },
      body: JSON.stringify({
        email,
        password: "register-password-123",
        displayName: "Kho mới",
        role: "SHIPPER",
        shipperId: "spoof",
      }),
    });
    const body = (await response.json()) as Json;
    assert.equal(response.status, 400);
    assert.equal((body.error as Json).code, "invalid_request");

    const created = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://127.0.0.1:5173" },
      body: JSON.stringify({ email, password: "register-password-123", displayName: "Kho mới", role: "SHIPPER" }),
    });
    const createdBody = (await created.json()) as Json;
    const user = createdBody.user as Json;
    assert.equal(created.status, 201);
    assert.equal(user.email, email);
    assert.equal(user.role, "SHIPPER");
    assert.equal(user.mustChangePassword, false);
    assert.equal(JSON.stringify(createdBody).includes("register-password-123"), false);
    assert.equal(JSON.stringify(createdBody).includes("passwordHash"), false);
    sessionCookie(created);

    const duplicate = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://127.0.0.1:5173" },
      body: JSON.stringify({ email, password: "another-password-123", displayName: "Trùng", role: "CARRIER" }),
    });
    const duplicateBody = (await duplicate.json()) as Json;
    assert.equal(duplicate.status, 409);
    assert.equal((duplicateBody.error as Json).code, "email_taken");

    const driver = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://127.0.0.1:5173" },
      body: JSON.stringify({
        email: "new.driver.auth-test@coldi.local",
        password: "register-password-123",
        displayName: "Tài xế tự đăng ký",
        role: "DRIVER",
      }),
    });
    const driverBody = (await driver.json()) as { error: { fields: { role: string } } };
    assert.equal(driver.status, 400);
    assert.match(driverBody.error.fields.role, /nhà xe/);
    assert.equal(await User.countDocuments({ email: "new.driver.auth-test@coldi.local" }), 0);
  });
});

test("login from an untrusted origin is rejected", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://evil.example" },
      body: JSON.stringify({ email: shipperEmail, password }),
    });
    assert.equal(response.status, 403);
  });
});

import { randomBytes } from "node:crypto";
/**
 * Visual QA for package screens on disposable database coldi_visual_qa.
 * Playwright loads from PLAYWRIGHT_PACKAGE, outside this repo.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { hashPassword } from "../src/auth/password.js";
import { AccountSubscription } from "../src/models/package.js";
import { User } from "../src/models/user.js";

const databaseName = "coldi_visual_qa";
const forbidden = new Set(["coldi", "admin", "local", "config"]);
const apiPort = 4091;
const webPort = 5186;
const webOrigin = `http://127.0.0.1:${webPort}`;
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const mongoUri = `mongodb://127.0.0.1:27017/${databaseName}`;
const password = process.env.QA_PASSWORD?.trim() || `qa-${randomBytes(12).toString("hex")}`;
const shipperEmail = "shipper.visual@coldi.local";
const carrierEmail = "carrier.visual@coldi.local";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const serverDir = path.join(root, "server");
const webDir = path.join(root, "web");
const shotDir = "C:/Users/light/AppData/Local/Temp/coldi-pkg-visual";
const playwrightPackage = process.env.PLAYWRIGHT_PACKAGE ?? "C:/Users/light/AppData/Local/Temp/coldi-pkg-e2e/package.json";

type PwPage = {
  goto: (url: string, options?: { waitUntil?: "domcontentloaded" }) => Promise<unknown>;
  locator: (selector: string) => PwLocator;
  getByText: (text: string | RegExp) => PwLocator;
  getByRole: (role: string, options?: { name?: string | RegExp }) => PwLocator;
  getByLabel: (text: string) => PwLocator;
  setViewportSize: (size: { width: number; height: number }) => Promise<void>;
  screenshot: (options: { path: string; fullPage?: boolean }) => Promise<unknown>;
  waitForFunction: (fn: () => boolean) => Promise<unknown>;
  route: (pattern: string, handler: (route: { continue: () => Promise<void>; fulfill: (options: { status: number; contentType: string; body: string }) => Promise<void> }) => Promise<void>) => Promise<void>;
  unroute: (pattern: string) => Promise<void>;
  evaluate: (expression: string) => Promise<boolean>;
};

type PwLocator = {
  first: () => PwLocator;
  filter: (options: { has?: PwLocator; hasText?: string }) => PwLocator;
  getByRole: (role: string, options?: { name?: string | RegExp }) => PwLocator;
  getByLabel: (text: string) => PwLocator;
  click: () => Promise<void>;
  fill: (value: string) => Promise<void>;
  selectOption: (option: { value: string }) => Promise<unknown>;
  waitFor: (options?: { timeout?: number }) => Promise<void>;
};

const findings: string[] = [];
const children: ChildProcess[] = [];
let browser: { close: () => Promise<void> } | null = null;
let carrierId = "";

function guardDatabase(name: string) {
  if (name !== databaseName || forbidden.has(name) || !/(test|qa|demo)/i.test(name)) {
    throw new Error(`Refusing to use database ${name}.`);
  }
}

function stop(child: ChildProcess) {
  if (!child.pid) return;
  spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
}

function portFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port }, () => {
      socket.end();
      resolve(false);
    });
    socket.on("error", () => resolve(true));
  });
}

function startLogged(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv, ready: RegExp): Promise<ChildProcess> {
  const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  children.push(child);
  let output = "";
  const append = (chunk: Buffer) => {
    output += chunk.toString();
    if (output.length > 80_000) output = output.slice(-40_000);
  };
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Process did not become ready.\n${output.slice(-3000)}`)), 90_000);
    const onData = () => {
      if (ready.test(output)) {
        clearTimeout(timer);
        resolve(child);
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Process exited ${code} before ready.\n${output.slice(-3000)}`));
    });
  });
}

async function seed() {
  guardDatabase(databaseName);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 4000 });
  guardDatabase(mongoose.connection.name);
  await mongoose.connection.dropDatabase();
  const passwordHash = await hashPassword(password);
  const carrier = await User.create({ email: carrierEmail, passwordHash, role: "CARRIER", displayName: "Nhà xe QA" });
  await User.create({ email: shipperEmail, passwordHash, role: "SHIPPER", displayName: "Chủ hàng QA" });
  carrierId = carrier.id;
  await mongoose.disconnect();
}

async function expirePaidPlan() {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 4000 });
  guardDatabase(mongoose.connection.name);
  const updated = await AccountSubscription.updateOne({ accountId: carrierId }, { $set: { endAt: new Date(Date.now() - 60_000) } });
  await mongoose.disconnect();
  if (updated.matchedCount !== 1) throw new Error("Paid subscription was not found.");
}

async function signIn(page: PwPage, email: string) {
  await page.goto(`${webOrigin}/dang-nhap`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.innerText.includes("Đã đăng nhập") || document.querySelector("#login-email") !== null);
  if ((await page.getByText("Đã đăng nhập").count()) > 0) {
    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await page.locator("#login-email").waitFor();
  }
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.getByText(email).first().waitFor();
}

async function addVehicle(page: PwPage, label: string, plate: string) {
  await page.goto(`${webOrigin}/carrier/doi-xe/xe/moi`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Tên xe").fill(label);
  await page.getByLabel("Biển số").fill(plate);
  await page.getByLabel("Loại phương tiện").selectOption({ value: "REEFER_TRUCK" });
  await page.getByLabel("Nhóm nhiệt độ hỗ trợ").selectOption({ value: "FROZEN" });
  await page.getByLabel("Tải trọng (tấn)").fill("5");
  await page.getByRole("button", { name: "Thêm phương tiện" }).click();
}

async function capture(page: PwPage, name: string) {
  mkdirSync(shotDir, { recursive: true });
  const file = path.join(shotDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  const overflow = await page.evaluate(`(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  })()`);
  findings.push(`${overflow ? "OVERFLOW" : "FIT"}  ${name}`);
  console.log(`${overflow ? "OVERFLOW" : "FIT"}  ${name}`);
}

async function setSize(page: PwPage, width: number) {
  await page.setViewportSize({ width, height: width < 700 ? 844 : 900 });
}

async function visual(page: PwPage) {
  await setSize(page, 1440);
  let releaseCatalog: () => void = () => undefined;
  const catalogGate = new Promise<void>((resolve) => {
    releaseCatalog = resolve;
  });
  await page.route("**/api/packages/catalog", async (route) => {
    await catalogGate;
    await route.continue();
  });
  const loading = page.goto(`${webOrigin}/goi-dich-vu`, { waitUntil: "domcontentloaded" });
  await page.getByText("Đang tải bảng giá.").waitFor();
  await capture(page, "catalog-desktop-loading");
  releaseCatalog();
  await loading;
  await page.unroute("**/api/packages/catalog");
  await page.getByRole("heading", { name: "Chủ hàng" }).waitFor();
  await page.getByText("799.000 VND").first().waitFor();
  await capture(page, "catalog-desktop");
  await setSize(page, 390);
  await capture(page, "catalog-mobile");

  await setSize(page, 1440);
  await page.route("**/api/packages/catalog", async (route) => {
    await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
  });
  await page.goto(`${webOrigin}/goi-dich-vu`, { waitUntil: "domcontentloaded" });
  await page.getByRole("alert").getByText("Không tải được bảng giá.").waitFor();
  await capture(page, "catalog-desktop-error");
  await page.unroute("**/api/packages/catalog");

  await signIn(page, shipperEmail);
  await page.goto(`${webOrigin}/shipper/goi`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Free", exact: true }).waitFor();
  await page.getByText(/6[.\s\u00a0\u202f]?990[.\s\u00a0\u202f]?000/).first().waitFor();
  await capture(page, "shipper-plan-desktop");
  await setSize(page, 390);
  await capture(page, "shipper-plan-mobile");
  await setSize(page, 1440);
  await page.route("**/api/packages/**", async (route) => {
    await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
  });
  await page.goto(`${webOrigin}/shipper/goi`, { waitUntil: "domcontentloaded" });
  await page.getByRole("alert").getByText("Không tải được gói.").waitFor();
  await capture(page, "shipper-plan-error");
  await page.unroute("**/api/packages/**");

  await signIn(page, carrierEmail);
  await page.goto(`${webOrigin}/carrier/doi-xe`, { waitUntil: "domcontentloaded" });
  await page.getByText("Chưa có xe").waitFor();
  await capture(page, "fleet-empty-desktop");
  await setSize(page, 390);
  await capture(page, "fleet-empty-mobile");
  await setSize(page, 1440);
  await page.goto(`${webOrigin}/carrier/goi`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Free", exact: true }).waitFor();
  await page.getByText("2 / 2").waitFor().catch(() => page.getByText("0 / 2").waitFor());
  await capture(page, "carrier-plan-desktop");
  await setSize(page, 390);
  await capture(page, "carrier-plan-mobile");

  await setSize(page, 1440);
  const longName = "Xe lạnh tên rất dài để kiểm tra tràn khung thẻ đội xe QA";
  await addVehicle(page, longName, "51C-210.01");
  await page.waitForFunction(() => /\/carrier\/doi-xe\/xe\/[a-f0-9]{24}$/i.test(window.location.pathname));
  await addVehicle(page, "Xe QA 2", "51C-210.02");
  await page.waitForFunction(() => /\/carrier\/doi-xe\/xe\/[a-f0-9]{24}$/i.test(window.location.pathname));
  await addVehicle(page, "Xe QA 3", "51C-210.03");
  await page.getByRole("alert").getByText("Đã đạt số xe hoạt động của gói hiện tại.").waitFor();
  await capture(page, "fleet-cap-error-desktop");
  await setSize(page, 390);
  await capture(page, "fleet-cap-error-mobile");

  await setSize(page, 1440);
  await page.goto(`${webOrigin}/carrier/doi-xe`, { waitUntil: "domcontentloaded" });
  await page.getByText(longName).first().waitFor();
  await capture(page, "fleet-list-desktop");
  await setSize(page, 390);
  await capture(page, "fleet-list-mobile");
  await setSize(page, 1440);
  const first = page.locator("article").filter({ hasText: longName });
  await first.getByRole("button", { name: "Lưu trữ" }).click();
  await first.getByRole("button", { name: "Xác nhận lưu trữ" }).waitFor();
  await capture(page, "fleet-archive-confirm");
  await first.getByRole("button", { name: "Xác nhận lưu trữ" }).click();
  await page.getByText("Đã lưu trữ xe. Xe này không còn tính vào hạn mức.").waitFor();
  await capture(page, "fleet-archived");
  await addVehicle(page, "Xe QA 3", "51C-210.03");
  await page.waitForFunction(() => /\/carrier\/doi-xe\/xe\/[a-f0-9]{24}$/i.test(window.location.pathname));
  await page.goto(`${webOrigin}/carrier/doi-xe`, { waitUntil: "domcontentloaded" });
  const archived = page.locator("article").filter({ hasText: longName });
  await archived.getByRole("button", { name: "Khôi phục" }).click();
  await page.getByText("Đã đạt số xe hoạt động của gói hiện tại.").waitFor();
  await capture(page, "fleet-restore-error");

  await page.goto(`${webOrigin}/carrier/goi`, { waitUntil: "domcontentloaded" });
  const monthly = page.locator("li").filter({ has: page.getByRole("heading", { name: "Pro Monthly", exact: true }) });
  await monthly.getByRole("button", { name: "Kích hoạt bản Demo" }).click();
  await page.getByRole("status").getByText("Demo — không phát sinh thanh toán").waitFor();
  await page.getByText(/999[.\s\u00a0\u202f]?000/).first().waitFor();
  await capture(page, "carrier-demo-desktop");
  await setSize(page, 390);
  await capture(page, "carrier-demo-mobile");

  await setSize(page, 1440);
  await page.goto(`${webOrigin}/carrier/doi-xe`, { waitUntil: "domcontentloaded" });
  await page.locator("article").filter({ hasText: longName }).getByRole("button", { name: "Khôi phục" }).click();
  await page.getByText("Đã khôi phục xe vào danh sách hoạt động.").waitFor();
  await capture(page, "fleet-restored");

  await expirePaidPlan();
  await page.goto(`${webOrigin}/carrier/goi`, { waitUntil: "domcontentloaded" });
  await page.getByRole("alert").getByText("Đang vượt trần xe.").waitFor();
  await capture(page, "carrier-over-limit-desktop");
  await setSize(page, 390);
  await capture(page, "carrier-over-limit-mobile");

  const shipperCookie = await loginApi(shipperEmail);
  await publishShipment(shipperCookie);
  await setSize(page, 1440);
  await page.goto(`${webOrigin}/carrier/tim-chuyen`, { waitUntil: "domcontentloaded" });
  await page.locator("article").filter({ hasText: "Hàng QA hình ảnh" }).getByRole("button", { name: "Nhận chuyến" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận nhận chuyến" }).click();
  await page.getByText("Nhà xe đang vượt số xe hoạt động của gói hiện tại.").waitFor();
  await capture(page, "claim-over-limit-desktop");
  await setSize(page, 390);
  await capture(page, "claim-over-limit-mobile");
}

async function loginApi(email: string): Promise<string> {
  const response = await fetch(`${apiOrigin}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: webOrigin },
    body: JSON.stringify({ email, password }),
  });
  if (response.status !== 200) throw new Error(`Login failed ${response.status}`);
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith("coldi_session="));
  if (!cookie) throw new Error("Missing session cookie.");
  return cookie.split(";")[0] ?? "";
}

async function publishShipment(cookie: string) {
  const response = await fetch(`${apiOrigin}/api/shipments`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: webOrigin, cookie },
    body: JSON.stringify({
      cargoDescription: "Hàng QA hình ảnh",
      pickupLocation: "Cái Bè, Tiền Giang",
      deliveryLocation: "Thủ Đức, TP. Hồ Chí Minh",
      temperatureGroup: "FROZEN",
      vehicleRequirement: "Xe đông lạnh 5 tấn",
      listedPriceVnd: 5000000,
      pickupCompany: "Kho kiểm tra",
      pickupContactName: "Người lấy",
      pickupPhone: "0908123456",
      pickupDate: "2026-10-22",
      pickupTimeFrom: "08:00",
      pickupTimeTo: "11:30",
      deliveryCompany: "Kho giao",
      deliveryContactName: "Người nhận",
      deliveryPhone: "0912889999",
      deliveryDate: "2026-10-23",
      deliveryTimeFrom: "14:00",
      deliveryTimeTo: "18:00",
      cargoWeightTon: 2,
      cargoVolumeM3: 8,
      packageCount: 10,
    }),
  });
  if (response.status !== 201) throw new Error(`Publish failed ${response.status}`);
}

async function main() {
  if (!(await portFree(apiPort)) || !(await portFree(webPort))) throw new Error("Visual QA port is already in use.");
  await seed();
  const shared = {
    ...process.env,
    PORT: String(apiPort),
    MONGODB_URI: mongoUri,
    FRONTEND_ORIGIN: webOrigin,
    NODE_ENV: "test",
    AUTH_SECRET: process.env.QA_AUTH_SECRET?.trim() || randomBytes(32).toString("hex"),
    APP_RUNTIME_MODE: "qa",
    PACKAGE_DEMO_SELF_ACTIVATION_ENABLED: "true",
    PACKAGE_DEMO_DEPLOYMENT_ID: "qa-package-visual",
    PACKAGE_DEMO_AUTHORIZED_DEPLOYMENT_ID: "qa-package-visual",
  };
  await startLogged(process.execPath, [path.join(serverDir, "node_modules/tsx/dist/cli.mjs"), "src/index.ts"], serverDir, shared, new RegExp(`COLDI API listening on port ${apiPort}`));
  await startLogged(process.execPath, [path.join(webDir, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], webDir, { ...shared, VITE_API_ORIGIN: apiOrigin }, /Local:/);
  const require = createRequire(playwrightPackage);
  const { chromium } = require("playwright") as {
    chromium: { launch: (options: { headless: boolean }) => Promise<{ newContext: (options: { viewport: { width: number; height: number }; locale: string }) => Promise<{ newPage: () => Promise<PwPage>; close: () => Promise<void> }>; close: () => Promise<void> }> };
  };
  const launched = await chromium.launch({ headless: true });
  browser = launched;
  const context = await launched.newContext({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
  const page = await context.newPage();
  await visual(page);
  await context.close();
}

let failed = false;
try {
  await main();
} catch (error) {
  failed = true;
  console.error(error instanceof Error ? error.stack ?? error.message : error);
} finally {
  if (browser) await browser.close().catch(() => undefined);
  for (const child of children) stop(child);
  if (mongoose.connection.readyState !== 0) {
    guardDatabase(mongoose.connection.name);
    await mongoose.disconnect();
  }
  console.log(findings.join("\n"));
  process.exit(failed ? 1 : 0);
}

import { randomBytes } from "node:crypto";
/**
 * Browser QA for package management on a disposable database.
 * Refuses any database whose name is not exactly coldi_package_qa.
 * Playwright is loaded from PLAYWRIGHT_PACKAGE (a package.json outside this repo).
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import net from "node:net";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { hashPassword } from "../src/auth/password.js";
import { AccountSubscription } from "../src/models/package.js";
import { User } from "../src/models/user.js";

const databaseName = "coldi_package_qa";
const forbidden = new Set(["coldi", "admin", "local", "config"]);
const apiPort = 4088;
const webPort = 5183;
const webOrigin = `http://127.0.0.1:${webPort}`;
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const mongoUri = `mongodb://127.0.0.1:27017/${databaseName}`;
const password = process.env.QA_PASSWORD?.trim() || `qa-${randomBytes(12).toString("hex")}`;
const shipperEmail = "shipper.e2e@coldi.local";
const carrierEmail = "carrier.e2e@coldi.local";
const driverEmail = "driver.e2e@coldi.local";
const claimedCargo = "Hàng QA nhận được";
const blockedCargo = "Hàng QA vượt trần";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const serverDir = path.join(root, "server");
const webDir = path.join(root, "web");
const shotDir = path.join(root, "..", "coldi-pkg-e2e-shots");
const playwrightPackage = process.env.PLAYWRIGHT_PACKAGE ?? "C:/Users/light/AppData/Local/Temp/coldi-pkg-e2e/package.json";

type FlowStatus = "PASS" | "FAIL" | "NOT RUN";
type Flow = { name: string; status: FlowStatus; detail: string };
type PwPage = {
  goto: (url: string, options?: { waitUntil?: "domcontentloaded" }) => Promise<unknown>;
  reload: (options?: { waitUntil?: "domcontentloaded" }) => Promise<unknown>;
  locator: (selector: string) => PwLocator;
  getByText: (text: string | RegExp) => PwLocator;
  getByRole: (role: string, options?: { name?: string | RegExp }) => PwLocator;
  getByLabel: (text: string) => PwLocator;
  screenshot: (options: { path: string; fullPage?: boolean }) => Promise<unknown>;
  evaluate: (expression: string) => Promise<number[]>;
  waitForFunction: (fn: () => boolean) => Promise<unknown>;
};

type PwLocator = {
  first: () => PwLocator;
  filter: (options: { hasText?: string | RegExp; has?: PwLocator }) => PwLocator;
  locator: (selector: string) => PwLocator;
  getByRole: (role: string, options?: { name?: string | RegExp }) => PwLocator;
  getByText: (text: string | RegExp) => PwLocator;
  getByLabel: (text: string) => PwLocator;
  click: () => Promise<void>;
  fill: (value: string) => Promise<void>;
  selectOption: (option: { value?: string; label?: string }) => Promise<unknown>;
  waitFor: (options?: { state?: "visible" | "hidden"; timeout?: number }) => Promise<void>;
  textContent: () => Promise<string | null>;
  count: () => Promise<number>;
  isDisabled: () => Promise<boolean>;
  innerText: () => Promise<string>;
};

const flows: Flow[] = [];
const children: ChildProcess[] = [];
let browser: { close: () => Promise<void> } | null = null;
let failed = false;
let carrierId = "";

function guardDatabase(name: string) {
  if (name !== databaseName || forbidden.has(name) || !/(test|qa|demo)/i.test(name)) {
    throw new Error(`Refusing to use database ${name}.`);
  }
}

function record(name: string, status: FlowStatus, detail: string) {
  flows.push({ name, status, detail });
  console.log(`${status}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function portFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port }, () => {
      socket.end();
      resolve(false);
    });
    socket.on("error", () => resolve(true));
  });
}

function stop(child: ChildProcess) {
  if (!child.pid) return;
  spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
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
    const timer = setTimeout(() => {
      reject(new Error(`Process did not become ready.\n${output.slice(-4000)}`));
    }, 90_000);
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
      reject(new Error(`Process exited ${code} before ready.\n${output.slice(-4000)}`));
    });
  });
}

async function seed() {
  guardDatabase(databaseName);
  const parsed = new URL(mongoUri);
  if (parsed.pathname !== `/${databaseName}`) throw new Error("Mongo URI pathname does not match the disposable database.");
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 4000 });
  guardDatabase(mongoose.connection.name);
  await mongoose.connection.dropDatabase();
  const passwordHash = await hashPassword(password);
  const carrier = await User.create({ email: carrierEmail, passwordHash, role: "CARRIER", displayName: "Nhà xe QA" });
  await User.create({ email: shipperEmail, passwordHash, role: "SHIPPER", displayName: "Chủ hàng QA" });
  await User.create({
    email: driverEmail,
    passwordHash,
    role: "DRIVER",
    carrierId: carrier._id,
    displayName: "Tài xế QA",
    mustChangePassword: false,
    accountStatus: "ACTIVE",
  });
  carrierId = carrier.id;
  await mongoose.disconnect();
}

async function expirePaidPlan() {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 4000 });
  guardDatabase(mongoose.connection.name);
  const updated = await AccountSubscription.updateOne({ accountId: carrierId }, { $set: { endAt: new Date(Date.now() - 60_000) } });
  await mongoose.disconnect();
  if (updated.matchedCount !== 1) throw new Error("Paid subscription was not found on the disposable database.");
}

async function loginApi(email: string): Promise<string> {
  const response = await fetch(`${apiOrigin}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: webOrigin },
    body: JSON.stringify({ email, password }),
  });
  if (response.status !== 200) throw new Error(`API login for ${email} returned ${response.status}.`);
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith("coldi_session="));
  if (!cookie) throw new Error("API login did not set a session cookie.");
  return cookie.split(";")[0] ?? "";
}

async function publishShipment(cookie: string, cargoDescription: string) {
  const response = await fetch(`${apiOrigin}/api/shipments`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: webOrigin, cookie },
    body: JSON.stringify({
      cargoDescription,
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
  if (response.status !== 201) throw new Error(`Publish returned ${response.status}: ${await response.text()}`);
}

async function openLogin(page: PwPage) {
  await page.goto(`${webOrigin}/dang-nhap`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.innerText.includes("Đã đăng nhập") || document.querySelector("#login-email") !== null);
  if ((await page.getByText("Đã đăng nhập").count()) > 0) {
    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await page.locator("#login-email").waitFor();
  }
}

async function signIn(page: PwPage, email: string) {
  await openLogin(page);
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

async function vehicleSaved(page: PwPage) {
  await page.waitForFunction(() => /\/carrier\/doi-xe\/xe\/[a-f0-9]{24}$/i.test(window.location.pathname));
}

async function runFlow(name: string, page: PwPage, action: () => Promise<string>) {
  if (failed) {
    record(name, "NOT RUN", "An earlier browser flow failed.");
    return;
  }
  try {
    record(name, "PASS", await action());
  } catch (error) {
    failed = true;
    const detail = error instanceof Error ? error.message : String(error);
    mkdirSync(shotDir, { recursive: true });
    const file = path.join(shotDir, `${flows.length + 1}.png`);
    await page.screenshot({ path: file, fullPage: true }).catch(() => undefined);
    record(name, "FAIL", `${detail} Screenshot: ${file}`);
  }
}

async function browserQa() {
  const require = createRequire(playwrightPackage);
  const { chromium } = require("playwright") as {
    chromium: {
      launch: (options: { headless: boolean }) => Promise<{
        newContext: (options: {
          viewport: { width: number; height: number };
          locale: string;
          geolocation: { latitude: number; longitude: number };
          permissions: string[];
        }) => Promise<{ newPage: () => Promise<PwPage>; close: () => Promise<void> }>;
        close: () => Promise<void>;
      }>;
    };
  };
  const launched = await chromium.launch({ headless: true });
  browser = launched;
  const context = await launched.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "vi-VN",
    geolocation: { latitude: 10.82, longitude: 106.62 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await runFlow("Guest catalog shows published Business and Enterprise prices", page, async () => {
    await page.goto(`${webOrigin}/goi-dich-vu`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Gói dịch vụ COLDI" }).waitFor();
    await page.getByText(/799[.\s\u00a0\u202f]?000/).first().waitFor();
    await page.getByText(/999[.\s\u00a0\u202f]?000/).first().waitFor();
    await page.getByText(/6[.\s\u00a0\u202f]?990[.\s\u00a0\u202f]?000/).first().waitFor();
    await page.getByRole("tab", { name: "Nhà xe" }).click();
    await page.getByText(/2[.\s\u00a0\u202f]?990[.\s\u00a0\u202f]?000/).first().waitFor();
    await page.getByText("30 xe ACTIVE").first().waitFor();
    await page.getByText("100 xe ACTIVE").first().waitFor();
    await page.getByText("2 xe").first().waitFor();
    if ((await page.getByRole("button", { name: /Thanh toán|Kích hoạt/ }).count()) !== 0) {
      throw new Error("The public catalog exposed a payment or activation control.");
    }
    return "Shipper Pro 799000, Carrier Pro 999000, published Business and Enterprise prices, carrier Free cap 2.";
  });

  await runFlow("Shipper Free plan has no contract inputs", page, async () => {
    await signIn(page, shipperEmail);
    await page.goto(`${webOrigin}/shipper/goi`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Free", exact: true }).waitFor();
    await page.getByText("0 VND").first().waitFor();
    const enterprise = page.locator("li").filter({ hasText: "Enterprise" });
    await enterprise.getByText(/6[.\s\u00a0\u202f]?990[.\s\u00a0\u202f]?000/).first().waitFor();
    if ((await enterprise.getByRole("button", { name: /Thanh toán/ }).count()) !== 0) throw new Error("Enterprise exposed a payment button.");
    if ((await page.locator("input, textarea").count()) !== 0) throw new Error("The shipper plan page accepted typed commercial terms.");
    return "Free plan, zero price, quote copy, no price or cap fields.";
  });

  await runFlow("Driver cannot open the carrier plan", page, async () => {
    await signIn(page, driverEmail);
    await page.goto(`${webOrigin}/carrier/goi`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Trang này không mở với vai trò hiện tại." }).waitFor();
    return "Role gate refused the driver.";
  });

  await runFlow("Carrier free cap blocks a third active vehicle", page, async () => {
    await signIn(page, carrierEmail);
    await addVehicle(page, "Xe QA 1", "51C-100.01");
    await vehicleSaved(page);
    await addVehicle(page, "Xe QA 2", "51C-100.02");
    await vehicleSaved(page);
    await addVehicle(page, "Xe QA 3", "51C-100.03");
    await page.getByRole("alert").getByText("Đã đạt số xe hoạt động của gói hiện tại.").waitFor();
    await page.goto(`${webOrigin}/carrier/goi`, { waitUntil: "domcontentloaded" });
    await page.getByText("2 / 2").waitFor();
    return "The third create showed the cap message and the plan stayed at 2 / 2.";
  });

  await runFlow("Archive frees one slot and a concurrent pair cannot pass the cap", page, async () => {
    await page.goto(`${webOrigin}/carrier/doi-xe`, { waitUntil: "domcontentloaded" });
    const first = page.locator("article").filter({ hasText: "Xe QA 1" });
    await first.getByRole("button", { name: "Lưu trữ" }).click();
    await first.getByRole("button", { name: "Xác nhận lưu trữ" }).click();
    await page.getByText("Đã lưu trữ xe. Xe này không còn tính vào hạn mức.").waitFor();
    const statuses = await page.evaluate(`(async () => {
      const post = (plate) => fetch(${JSON.stringify(apiOrigin)} + "/api/carrier/fleet/vehicles", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: "Xe song song " + plate,
          plate,
          vehicleKind: "REEFER_TRUCK",
          temperatureGroup: "FROZEN",
          capacityTon: 5,
        }),
      }).then((response) => response.status);
      return Promise.all([post("51C-901.01"), post("51C-901.02")]);
    })()`);
    const created = statuses.filter((status) => status === 201).length;
    const refused = statuses.filter((status) => status === 409).length;
    if (created !== 1 || refused !== 1) throw new Error(`Concurrent creates returned ${statuses.join(", ")}.`);
    await page.goto(`${webOrigin}/carrier/goi`, { waitUntil: "domcontentloaded" });
    await page.getByText("2 / 2").waitFor();
    return `Concurrent statuses ${statuses.join(", ")}; active count stayed at the cap.`;
  });

  await runFlow("Restore at the free cap is refused", page, async () => {
    await page.goto(`${webOrigin}/carrier/doi-xe`, { waitUntil: "domcontentloaded" });
    const archived = page.locator("article").filter({ hasText: "Xe QA 1" });
    await archived.getByRole("button", { name: "Khôi phục" }).click();
    await page.getByText("Đã đạt số xe hoạt động của gói hiện tại.").waitFor();
    await archived.getByText("Đã lưu trữ").waitFor();
    return "Restore stayed archived and showed the cap message.";
  });

  await runFlow("Demo activation persists the catalog price without payment", page, async () => {
    await page.goto(`${webOrigin}/carrier/goi`, { waitUntil: "domcontentloaded" });
    const monthly = page.locator("li").filter({ has: page.getByRole("heading", { name: "Pro Monthly", exact: true }) });
    await monthly.getByRole("button", { name: "Kích hoạt bản Demo" }).click();
    await page.getByRole("status").getByText("Demo — không phát sinh thanh toán").waitFor();
    await page.getByRole("heading", { name: "Pro Monthly", exact: true }).first().waitFor();
    await page.getByText(/999[.\s\u00a0\u202f]?000/).first().waitFor();
    if ((await page.getByRole("button", { name: /Thanh toán/ }).count()) !== 0) throw new Error("Activation offered a payment button.");
    if ((await page.locator("input, textarea").count()) !== 0) throw new Error("Activation still rendered commercial inputs.");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Pro Monthly", exact: true }).first().waitFor();
    await page.getByText(/999[.\s\u00a0\u202f]?000/).first().waitFor();
    await page.getByText("không phát sinh thanh toán").first().waitFor();
    return "Pro Monthly 999000 remained after reload, with no payment control.";
  });

  await runFlow("Restore succeeds after the higher cap", page, async () => {
    await page.goto(`${webOrigin}/carrier/doi-xe`, { waitUntil: "domcontentloaded" });
    const archived = page.locator("article").filter({ hasText: "Xe QA 1" });
    await archived.getByRole("button", { name: "Khôi phục" }).click();
    await page.getByText("Đã khôi phục xe vào danh sách hoạt động.").waitFor();
    await page.goto(`${webOrigin}/carrier/goi`, { waitUntil: "domcontentloaded" });
    await page.getByText("3 / 10").waitFor();
    return "The archived vehicle returned and usage became 3 / 10.";
  });

  await runFlow("Claim and assign an open shipment in the browser", page, async () => {
    await page.goto(`${webOrigin}/carrier/tim-chuyen`, { waitUntil: "domcontentloaded" });
    const card = page.locator("article").filter({ hasText: claimedCargo });
    await card.getByRole("button", { name: "Nhận chuyến" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Xác nhận nhận chuyến" }).click();
    await page.getByText("Đã nhận chuyến.").waitFor();
    await page.goto(`${webOrigin}/carrier/chuyen-cua-toi`, { waitUntil: "domcontentloaded" });
    const trip = page.locator("li").filter({ hasText: claimedCargo });
    await trip.locator("select").first().selectOption({ label: "Xe QA 1 · 51C-100.01" });
    await trip.locator("select").nth(1).selectOption({ label: "Tài xế QA" });
    await trip.getByRole("button", { name: "Phân công xe và tài xế" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Xác nhận phân công" }).click();
    await page.getByText("Đã phân công.").first().waitFor();
    await page.getByText("Chưa xác nhận lấy hàng.").first().waitFor();
    return "The carrier claimed and assigned Xe QA 1 with Tài xế QA.";
  });

  await runFlow("Archive is refused while the trip is unfinished", page, async () => {
    await page.goto(`${webOrigin}/carrier/doi-xe`, { waitUntil: "domcontentloaded" });
    const assigned = page.locator("article").filter({ hasText: "Xe QA 1" });
    await assigned.getByText("Xe đang gắn với chuyến chưa kết thúc.").waitFor();
    if (!(await assigned.getByRole("button", { name: "Lưu trữ" }).isDisabled())) {
      throw new Error("Archive stayed enabled for a vehicle on an open trip.");
    }
    await assigned.getByText("Đang hoạt động").waitFor();
    return "The assigned vehicle stayed active and archive was disabled.";
  });

  await runFlow("Expired paid plan shows OVER_LIMIT after reload", page, async () => {
    await expirePaidPlan();
    await page.goto(`${webOrigin}/carrier/goi`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Free", exact: true }).waitFor();
    await page.getByRole("alert").getByText("Đang vượt trần xe.").waitFor();
    await page.getByText("3 / 2").waitFor();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("alert").getByText("Đang vượt trần xe.").waitFor();
    await page.getByText("3 / 2").waitFor();
    return "Fallback to Free left 3 active vehicles over the cap of 2.";
  });

  await runFlow("Pickup, GPS, and delivery continue on the claimed trip", page, async () => {
    await signIn(page, driverEmail);
    await page.goto(`${webOrigin}/driver/chuyen`, { waitUntil: "domcontentloaded" });
    const trip = page.locator("article").filter({ hasText: claimedCargo });
    await trip.getByRole("link", { name: "Xem chi tiết chuyến" }).click();
    await page.getByRole("button", { name: "Xác nhận đã lấy hàng" }).click();
    await page.getByRole("button", { name: "Ghi nhận xác nhận" }).click();
    await page.getByText("Đã xác nhận lấy hàng. Chuyến đang vận chuyển.").first().waitFor();
    await page.getByRole("button", { name: "Bắt đầu chia sẻ vị trí" }).click();
    await page.getByText("Đã gửi vị trí lên máy chủ.").waitFor({ timeout: 20_000 });
    await page.getByRole("button", { name: "Xác nhận đã giao hàng" }).click();
    await page.getByRole("button", { name: "Ghi nhận xác nhận" }).click();
    await page.getByText("Đã xác nhận giao hàng. Việc này chưa phải thanh toán.").first().waitFor();
    return "Pickup, a geolocation upload, and delivery completed while the carrier was over the cap.";
  });

  await runFlow("A new claim shows the over-limit message", page, async () => {
    await signIn(page, carrierEmail);
    await page.goto(`${webOrigin}/carrier/tim-chuyen`, { waitUntil: "domcontentloaded" });
    const card = page.locator("article").filter({ hasText: blockedCargo });
    await card.getByRole("button", { name: "Nhận chuyến" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Xác nhận nhận chuyến" }).click();
    await page.getByText("Nhà xe đang vượt số xe hoạt động của gói hiện tại.").waitFor();
    const body = await page.locator("body").innerText();
    if (body.includes("Đơn này đã có nhà xe khác nhận.")) {
      throw new Error("OVER_LIMIT was presented as another carrier winning the shipment.");
    }
    await card.getByRole("button", { name: "Nhận chuyến" }).waitFor();
    return "The server over-limit message stayed on screen and the shipment remained open.";
  });

  record("Visual design acceptance", "NOT RUN", "Functional browser checks do not sign off visual design.");
  await context.close();
}

async function main() {
  if (!(await portFree(apiPort)) || !(await portFree(webPort))) {
    throw new Error(`Port ${apiPort} or ${webPort} is already in use.`);
  }
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
    PACKAGE_DEMO_DEPLOYMENT_ID: "qa-package-e2e",
    PACKAGE_DEMO_AUTHORIZED_DEPLOYMENT_ID: "qa-package-e2e",
  };
  await startLogged(process.execPath, [path.join(serverDir, "node_modules/tsx/dist/cli.mjs"), "src/index.ts"], serverDir, shared, new RegExp(`COLDI API listening on port ${apiPort}`));
  await startLogged(process.execPath, [path.join(webDir, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], webDir, { ...shared, VITE_API_ORIGIN: apiOrigin }, /Local:/);
  const health = await fetch(`${apiOrigin}/api/health`);
  if (health.status !== 200) throw new Error(`API health returned ${health.status}.`);
  const shipperCookie = await loginApi(shipperEmail);
  await publishShipment(shipperCookie, claimedCargo);
  await publishShipment(shipperCookie, blockedCargo);
  await browserQa();
}

try {
  await main();
} catch (error) {
  failed = true;
  console.error(error instanceof Error ? error.message : error);
} finally {
  if (browser) await browser.close().catch(() => undefined);
  for (const child of children) stop(child);
  if (mongoose.connection.readyState !== 0) {
    guardDatabase(mongoose.connection.name);
    await mongoose.disconnect();
  }
  console.log("\nBROWSER QA");
  for (const flow of flows) console.log(`- ${flow.status}: ${flow.name}${flow.detail ? ` (${flow.detail})` : ""}`);
  const counts = {
    pass: flows.filter((flow) => flow.status === "PASS").length,
    fail: flows.filter((flow) => flow.status === "FAIL").length,
    notRun: flows.filter((flow) => flow.status === "NOT RUN").length,
  };
  console.log(JSON.stringify(counts));
  process.exit(failed || counts.fail > 0 ? 1 : 0);
}

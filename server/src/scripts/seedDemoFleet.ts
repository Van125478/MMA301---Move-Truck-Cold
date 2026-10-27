import "dotenv/config";
import type { Types } from "mongoose";
import { hashPassword } from "../auth/password.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { getEnv } from "../config/env.js";
import { User } from "../models/user.js";
import { Vehicle } from "../models/vehicle.js";
import { extraDemoDrivers } from "./demoExtraDrivers.js";
import { demoSpareVehicles } from "./demoSpareVehicles.js";
import type { TemperatureGroup } from "../models/shipment.js";

const primaryVehicleLabel = "Xe đông lạnh demo Core 05";

function readEmail(key: string): string {
  const email = process.env[key]?.trim().toLowerCase() ?? "";
  if (email.length === 0 || !email.includes("@")) {
    throw new Error(`${key} must be an email address.`);
  }
  return email;
}

function readDriverPassword(): string {
  const password = process.env.DEMO_DRIVER_PASSWORD ?? "";
  if (password.length < 8 || password.length > 72) {
    throw new Error("DEMO_DRIVER_PASSWORD must be 8 to 72 characters. Set it only in the local .env file.");
  }
  return password;
}

async function ensureDriverLinked(
  carrierId: Types.ObjectId,
  email: string,
  displayName: string,
  passwordHash: string | null,
): Promise<void> {
  const existing = await User.findOne({ email }).select("role carrierId");
  if (existing && existing.role !== "DRIVER") {
    throw new Error(`Refusing to use ${email} as a driver because role is ${existing.role}.`);
  }
  if (existing?.carrierId && existing.carrierId.toString() !== carrierId.toString()) {
    throw new Error(`Driver ${email} is already linked to a different carrier. Fleet seed stopped.`);
  }
  if (!existing) {
    await User.create({
      email,
      passwordHash: passwordHash!,
      role: "DRIVER",
      carrierId,
      displayName,
      accountStatus: "ACTIVE",
      mustChangePassword: false,
      sessionVersion: 0,
    });
    console.log(`Created demo DRIVER account ${email} (${displayName}).`);
    return;
  }
  await User.updateOne(
    { _id: existing._id },
    { $set: { carrierId, displayName: displayName.trim() || existing.displayName } },
  );
  console.log(`Linked demo driver ${email} to the demo carrier.`);
}

async function ensureVehicle(
  carrierId: Types.ObjectId,
  label: string,
  extra?: { plate?: string; vehicleKind?: "REEFER_TRUCK" | "REEFER_CONTAINER" | "REEFER_VAN" },
): Promise<void> {
  const setOnInsert: Record<string, unknown> = { carrierId, label };
  const set: Record<string, unknown> = {};
  if (extra?.plate) set.plate = extra.plate;
  if (extra?.vehicleKind) set.vehicleKind = extra.vehicleKind;
  await Vehicle.updateOne(
    { carrierId, label },
    { $setOnInsert: setOnInsert, ...(Object.keys(set).length > 0 ? { $set: set } : {}) },
    { upsert: true },
  );
}

async function ensureSpareVehicle(
  carrierId: Types.ObjectId,
  row: {
    label: string;
    plate: string;
    vehicleKind: "REEFER_TRUCK" | "REEFER_CONTAINER" | "REEFER_VAN";
    temperatureGroup: TemperatureGroup;
    capacityTon: number;
  },
): Promise<void> {
  await Vehicle.updateOne(
    { carrierId, label: row.label },
    {
      $setOnInsert: { carrierId, label: row.label, leasedShipmentIds: [] },
      $set: {
        plate: row.plate,
        vehicleKind: row.vehicleKind,
        temperatureGroup: row.temperatureGroup,
        capacityTon: row.capacityTon,
        status: "ACTIVE",
      },
    },
    { upsert: true },
  );
}

const env = getEnv();
if (env.NODE_ENV === "production") {
  console.error("Demo fleet seeding is disabled in production.");
  process.exit(1);
}

const connected = await connectDatabase(env.MONGODB_URI);
if (!connected) {
  console.error("Demo fleet was not prepared because MongoDB is unavailable.");
  process.exit(1);
}

try {
  const carrier = await User.findOne({ email: readEmail("DEMO_CARRIER_EMAIL"), role: "CARRIER" });
  const primaryEmail = readEmail("DEMO_DRIVER_EMAIL");
  const primary = await User.findOne({ email: primaryEmail, role: "DRIVER" });
  if (!carrier || !primary) {
    console.error("Demo carrier and driver accounts must exist. Run npm run seed:demo first.");
    process.exitCode = 1;
  } else {
    const passwordHash = await hashPassword(readDriverPassword());
    const carrierId = carrier._id;
    const primaryName = primary.displayName?.trim() || "Tài xế demo";
    await ensureDriverLinked(carrierId, primaryEmail, primaryName, null);
    await ensureVehicle(carrierId, primaryVehicleLabel);

    for (const row of extraDemoDrivers) {
      await ensureDriverLinked(carrierId, row.email, row.displayName, passwordHash);
      await ensureVehicle(carrierId, row.vehicleLabel, { plate: row.plate, vehicleKind: row.vehicleKind });
    }

    for (const row of demoSpareVehicles) {
      await ensureSpareVehicle(carrierId, row);
    }

    console.log(
      `Prepared demo fleet: 1 primary + ${extraDemoDrivers.length} extra drivers, ${extraDemoDrivers.length + 1 + demoSpareVehicles.length} vehicles (${demoSpareVehicles.length} spare, unassigned pool).`,
    );
    console.log(
      "On the app: sign in as demo carrier → tab Đã nhận → open a MATCHED trip with no driver/vehicle to pick xe and tài xế. Run npm run seed:shipments if none exist.",
    );
  }
} finally {
  await disconnectDatabase();
}

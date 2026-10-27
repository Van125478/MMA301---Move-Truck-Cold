import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { getEnv } from "../config/env.js";
import { Shipment } from "../models/shipment.js";
import { User } from "../models/user.js";
import { Vehicle } from "../models/vehicle.js";

function email(key: string): string {
  return process.env[key]?.trim().toLowerCase() ?? "";
}

const env = getEnv();
const connected = await connectDatabase(env.MONGODB_URI);
if (!connected) {
  console.error("MongoDB unavailable.");
  process.exit(1);
}

const databaseName = mongoose.connection.name;
const carrier = await User.findOne({ email: email("DEMO_CARRIER_EMAIL"), role: "CARRIER" });
if (!carrier) {
  console.error(`No demo carrier on database "${databaseName}". Run npm run seed:demo.`);
  await disconnectDatabase();
  process.exit(1);
}

const drivers = await User.find({ role: "DRIVER", carrierId: carrier._id }).sort({ displayName: 1 }).select("email displayName");
const vehicles = await Vehicle.find({ carrierId: carrier._id }).sort({ label: 1 }).select("label plate leasedShipmentIds");
const assignableTrips = await Shipment.find({
  carrierId: carrier._id,
  status: "MATCHED",
  vehicleId: null,
  driverId: null,
}).select("cargoDescription status");

console.log(`Database: ${databaseName}`);
console.log(`Drivers (${drivers.length}):`);
for (const row of drivers) console.log(`  - ${row.email} · ${row.displayName ?? ""}`);
console.log(`Vehicles (${vehicles.length}):`);
for (const row of vehicles) {
  const busy = (row.leasedShipmentIds?.length ?? 0) > 0 ? " · lease" : "";
  console.log(`  - ${row.label}${busy}`);
}
console.log(`Chuyến MATCHED chưa phân công (${assignableTrips.length}):`);
for (const row of assignableTrips) console.log(`  - ${row.cargoDescription}`);

await disconnectDatabase();

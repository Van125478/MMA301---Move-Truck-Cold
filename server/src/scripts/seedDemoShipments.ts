import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { getEnv } from "../config/env.js";
import { orderNoticeBody, recordOrderNotice } from "../orders/notices.js";
import { Shipment } from "../models/shipment.js";
import { ShipmentReview } from "../models/shipmentReview.js";
import { User } from "../models/user.js";
import { Vehicle } from "../models/vehicle.js";

const env = getEnv();
if (env.NODE_ENV === "production") {
  console.error("Demo shipment seeding is disabled in production.");
  process.exit(1);
}

const connected = await connectDatabase(env.MONGODB_URI);
if (!connected) {
  console.error("Demo shipments were not prepared because MongoDB is unavailable.");
  process.exit(1);
}

const databaseName = mongoose.connection.name;
if (databaseName !== "coldi_demo_local") {
  console.error(`Refusing to seed shipments on database ${databaseName}.`);
  await disconnectDatabase();
  process.exit(1);
}

function email(key: string): string {
  const value = process.env[key]?.trim().toLowerCase() ?? "";
  if (!value.includes("@")) throw new Error(`${key} must be an email address.`);
  return value;
}

try {
  const shipper = await User.findOne({ email: email("DEMO_SHIPPER_EMAIL"), role: "SHIPPER" });
  const carrier = await User.findOne({ email: email("DEMO_CARRIER_EMAIL"), role: "CARRIER" });
  const driver = await User.findOne({ email: email("DEMO_DRIVER_EMAIL"), role: "DRIVER" });
  if (!shipper || !carrier || !driver) {
    console.error("Demo shipper, carrier, and driver must exist. Run npm run seed:demo first.");
    process.exitCode = 1;
  } else {
    await User.updateOne(
      { _id: driver._id },
      { $set: { carrierId: carrier._id, displayName: driver.displayName?.trim() || "Tài xế demo", mustChangePassword: false, accountStatus: "ACTIVE" } },
    );

    const waitingVehicle = await Vehicle.findOneAndUpdate(
      { carrierId: carrier._id, label: "Xe lạnh 2,5 tấn · 51C-221.08" },
      {
        $setOnInsert: { carrierId: carrier._id, label: "Xe lạnh 2,5 tấn · 51C-221.08" },
        $set: { plate: "51C-221.08", vehicleKind: "REEFER_VAN", temperatureGroup: "COOL", capacityTon: 2.5, status: "ACTIVE" },
      },
      { upsert: true, returnDocument: "after" },
    );
    const runningVehicle = await Vehicle.findOneAndUpdate(
      { carrierId: carrier._id, label: "Xe lạnh 8 tấn · 51D-908.22" },
      {
        $setOnInsert: { carrierId: carrier._id, label: "Xe lạnh 8 tấn · 51D-908.22" },
        $set: { plate: "51D-908.22", vehicleKind: "REEFER_TRUCK", temperatureGroup: "FROZEN", capacityTon: 8, status: "ACTIVE" },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!waitingVehicle || !runningVehicle) throw new Error("Demo vehicles were not prepared.");

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const base = {
      shipperId: shipper._id,
      pickupCompany: "Kho Coldi",
      pickupContactName: "Nguyễn Minh",
      pickupPhone: "0903123456",
      deliveryCompany: "Kho nhận",
      deliveryContactName: "Trần Hà",
      deliveryPhone: "0913987654",
    };

    const published = [
      {
        cargoDescription: "Xoài cát Hòa Lộc và cam sành lạnh mát",
        pickupLocation: "Tiền Giang",
        deliveryLocation: "TP. Hồ Chí Minh",
        pickupDate: "2026-10-30",
        pickupTimeFrom: "06:00",
        pickupTimeTo: "09:00",
        deliveryDate: "2026-10-30",
        deliveryTimeFrom: "12:00",
        deliveryTimeTo: "16:00",
        cargoWeightTon: 2.5,
        cargoVolumeM3: 8,
        packageCount: 40,
        temperatureGroup: "COOL" as const,
        vehicleRequirement: "Xe lạnh",
        listedPriceVnd: 8_500_000,
      },
      {
        cargoDescription: "Thịt heo đông lạnh đóng thùng",
        pickupLocation: "Long An",
        deliveryLocation: "Bình Dương",
        pickupDate: "2026-10-31",
        pickupTimeFrom: "07:30",
        pickupTimeTo: "11:00",
        deliveryDate: "2026-10-31",
        deliveryTimeFrom: "13:00",
        deliveryTimeTo: "17:00",
        cargoWeightTon: 8,
        cargoVolumeM3: 18,
        packageCount: 120,
        temperatureGroup: "FROZEN" as const,
        vehicleRequirement: "Xe lạnh",
        listedPriceVnd: 12_000_000,
      },
      {
        cargoDescription: "Sữa tươi, yogurt và kem lạnh",
        pickupLocation: "Đồng Nai",
        deliveryLocation: "TP. Hồ Chí Minh",
        pickupDate: "2026-11-01",
        pickupTimeFrom: "05:00",
        pickupTimeTo: "08:00",
        deliveryDate: "2026-11-01",
        deliveryTimeFrom: "09:00",
        deliveryTimeTo: "12:00",
        cargoWeightTon: 5,
        cargoVolumeM3: 12,
        packageCount: 80,
        temperatureGroup: "COOL" as const,
        vehicleRequirement: "Xe lạnh",
        listedPriceVnd: 15_500_000,
      },
    ];

    for (const order of published) {
      await Shipment.updateOne(
        { shipperId: shipper._id, cargoDescription: order.cargoDescription, status: "PUBLISHED" },
        {
          $setOnInsert: {
            ...base,
            ...order,
            status: "PUBLISHED",
            events: [
              {
                type: "PUBLISHED",
                occurredAt: hourAgo,
                actorId: shipper._id,
                actorRole: "SHIPPER",
                statusAfter: "PUBLISHED",
                sequence: 1,
              },
            ],
          },
        },
        { upsert: true },
      );
    }

    const awaitingAssignment = [
      {
        cargoDescription: "Hải sản đông lạnh (đơn demo)",
        pickupLocation: "Cần Thơ",
        deliveryLocation: "TP. Hồ Chí Minh",
        pickupDate: "2026-10-28",
        pickupTimeFrom: "04:00",
        pickupTimeTo: "06:00",
        deliveryDate: "2026-10-28",
        deliveryTimeFrom: "10:00",
        deliveryTimeTo: "14:00",
        cargoWeightTon: 6,
        cargoVolumeM3: 14,
        packageCount: 90,
        temperatureGroup: "DEEP_FROZEN" as const,
        listedPriceVnd: 18_000_000,
      },
      {
        cargoDescription: "Sữa tươi lạnh (đơn demo)",
        pickupLocation: "Bình Dương",
        deliveryLocation: "Cần Thơ",
        pickupDate: "2026-10-28",
        pickupTimeFrom: "06:00",
        pickupTimeTo: "08:00",
        deliveryDate: "2026-10-28",
        deliveryTimeFrom: "14:00",
        deliveryTimeTo: "18:00",
        cargoWeightTon: 3,
        cargoVolumeM3: 8,
        packageCount: 40,
        temperatureGroup: "COOL" as const,
        listedPriceVnd: 7_500_000,
      },
      {
        cargoDescription: "Thịt gà đông (đơn demo)",
        pickupLocation: "Đồng Nai",
        deliveryLocation: "TP. Hồ Chí Minh",
        pickupDate: "2026-10-27",
        pickupTimeFrom: "20:00",
        pickupTimeTo: "22:00",
        deliveryDate: "2026-10-28",
        deliveryTimeFrom: "04:00",
        deliveryTimeTo: "07:00",
        cargoWeightTon: 5,
        cargoVolumeM3: 12,
        packageCount: 70,
        temperatureGroup: "FROZEN" as const,
        listedPriceVnd: 12_400_000,
      },
      {
        cargoDescription: "Kem đông (đơn demo)",
        pickupLocation: "Long An",
        deliveryLocation: "Vũng Tàu",
        pickupDate: "2026-10-28",
        pickupTimeFrom: "08:00",
        pickupTimeTo: "10:00",
        deliveryDate: "2026-10-28",
        deliveryTimeFrom: "12:00",
        deliveryTimeTo: "16:00",
        cargoWeightTon: 2,
        cargoVolumeM3: 6,
        packageCount: 30,
        temperatureGroup: "DEEP_FROZEN" as const,
        listedPriceVnd: 6_800_000,
      },
    ];

    let claimedSampleId: string | null = null;
    for (const order of awaitingAssignment) {
      const doc = await Shipment.findOneAndUpdate(
        { shipperId: shipper._id, cargoDescription: order.cargoDescription },
        {
          $set: {
            ...base,
            ...order,
            vehicleRequirement: "Xe lạnh",
            status: "MATCHED",
            carrierId: carrier._id,
            vehicleId: null,
            driverId: null,
            events: [
              {
                type: "PUBLISHED",
                occurredAt: hourAgo,
                actorId: shipper._id,
                actorRole: "SHIPPER",
                statusAfter: "PUBLISHED",
                sequence: 1,
              },
              {
                type: "CLAIMED",
                occurredAt: now,
                actorId: carrier._id,
                actorRole: "CARRIER",
                statusBefore: "PUBLISHED",
                statusAfter: "MATCHED",
                sequence: 2,
              },
            ],
          },
        },
        { upsert: true, returnDocument: "after" },
      );
      if (!claimedSampleId && doc) claimedSampleId = doc._id.toString();
    }

    const waiting = await Shipment.findOneAndUpdate(
      { shipperId: shipper._id, cargoDescription: "Rau củ lạnh mát chờ lấy hàng" },
      {
        $set: {
          ...base,
          cargoDescription: "Rau củ lạnh mát chờ lấy hàng",
          pickupLocation: "Đà Lạt",
          deliveryLocation: "TP. Hồ Chí Minh",
          pickupDate: "2026-10-27",
          pickupTimeFrom: "14:00",
          pickupTimeTo: "16:00",
          deliveryDate: "2026-10-28",
          deliveryTimeFrom: "06:00",
          deliveryTimeTo: "10:00",
          cargoWeightTon: 2.5,
          cargoVolumeM3: 10,
          packageCount: 60,
          temperatureGroup: "COOL",
          vehicleRequirement: "Xe lạnh",
          listedPriceVnd: 9_200_000,
          status: "MATCHED",
          carrierId: carrier._id,
          vehicleId: waitingVehicle._id,
          driverId: driver._id,
          pickupConfirmedAt: null,
          events: [
            {
              type: "PUBLISHED",
              occurredAt: hourAgo,
              actorId: shipper._id,
              actorRole: "SHIPPER",
              statusAfter: "PUBLISHED",
              sequence: 1,
            },
            {
              type: "CLAIMED",
              occurredAt: hourAgo,
              actorId: carrier._id,
              actorRole: "CARRIER",
              statusBefore: "PUBLISHED",
              statusAfter: "MATCHED",
              sequence: 2,
            },
            {
              type: "ASSIGNED",
              occurredAt: now,
              actorId: carrier._id,
              actorRole: "CARRIER",
              statusBefore: "MATCHED",
              statusAfter: "MATCHED",
              vehicleId: waitingVehicle._id,
              driverId: driver._id,
              assignedVehicleLabel: waitingVehicle.label,
              assignedDriverName: "Tài xế demo",
              sequence: 3,
            },
          ],
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    const running = await Shipment.findOneAndUpdate(
      { shipperId: shipper._id, cargoDescription: "Thịt bò đông lạnh đang trên đường" },
      {
        $set: {
          ...base,
          cargoDescription: "Thịt bò đông lạnh đang trên đường",
          pickupLocation: "Long An",
          deliveryLocation: "Vũng Tàu",
          pickupDate: "2026-10-27",
          pickupTimeFrom: "08:00",
          pickupTimeTo: "09:00",
          deliveryDate: "2026-10-27",
          deliveryTimeFrom: "15:00",
          deliveryTimeTo: "18:00",
          cargoWeightTon: 8,
          cargoVolumeM3: 16,
          packageCount: 70,
          temperatureGroup: "FROZEN",
          vehicleRequirement: "Xe lạnh",
          listedPriceVnd: 11_400_000,
          status: "IN_TRANSIT",
          carrierId: carrier._id,
          vehicleId: runningVehicle._id,
          driverId: driver._id,
          pickupConfirmedAt: hourAgo,
          pickupConfirmedBy: driver._id,
          latestLocation: {
            latitude: 10.77689,
            longitude: 106.70098,
            speedKmh: 42,
            bearingDeg: 120,
            observedAt: now,
            receivedAt: now,
            driverId: driver._id,
          },
          events: [
            {
              type: "PUBLISHED",
              occurredAt: hourAgo,
              actorId: shipper._id,
              actorRole: "SHIPPER",
              statusAfter: "PUBLISHED",
              sequence: 1,
            },
            {
              type: "CLAIMED",
              occurredAt: hourAgo,
              actorId: carrier._id,
              actorRole: "CARRIER",
              statusBefore: "PUBLISHED",
              statusAfter: "MATCHED",
              sequence: 2,
            },
            {
              type: "ASSIGNED",
              occurredAt: hourAgo,
              actorId: carrier._id,
              actorRole: "CARRIER",
              statusBefore: "MATCHED",
              statusAfter: "MATCHED",
              vehicleId: runningVehicle._id,
              driverId: driver._id,
              assignedVehicleLabel: runningVehicle.label,
              assignedDriverName: "Tài xế demo",
              sequence: 3,
            },
            {
              type: "PICKUP_CONFIRMED",
              occurredAt: hourAgo,
              actorId: driver._id,
              actorRole: "DRIVER",
              statusBefore: "MATCHED",
              statusAfter: "IN_TRANSIT",
              sequence: 4,
            },
          ],
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    const delivered = await Shipment.findOneAndUpdate(
      { shipperId: shipper._id, cargoDescription: "Sữa chua lạnh đã giao" },
      {
        $set: {
          ...base,
          cargoDescription: "Sữa chua lạnh đã giao",
          pickupLocation: "Đồng Nai",
          deliveryLocation: "TP. Hồ Chí Minh",
          pickupDate: "2026-10-20",
          pickupTimeFrom: "06:00",
          pickupTimeTo: "08:00",
          deliveryDate: "2026-10-20",
          deliveryTimeFrom: "11:00",
          deliveryTimeTo: "13:00",
          cargoWeightTon: 3,
          cargoVolumeM3: 8,
          packageCount: 40,
          temperatureGroup: "COOL",
          vehicleRequirement: "Xe lạnh",
          listedPriceVnd: 6_800_000,
          status: "DELIVERY_CONFIRMED",
          carrierId: carrier._id,
          vehicleId: waitingVehicle._id,
          driverId: driver._id,
          pickupConfirmedAt: hourAgo,
          pickupConfirmedBy: driver._id,
          deliveryConfirmedAt: now,
          deliveryConfirmedBy: driver._id,
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (delivered) {
      await ShipmentReview.updateOne(
        { shipmentId: delivered._id },
        {
          $setOnInsert: {
            shipmentId: delivered._id,
            shipperId: shipper._id,
            carrierId: carrier._id,
            stars: 5,
            comment: "Hàng lạnh đến đúng giờ, thùng còn nguyên.",
          },
        },
        { upsert: true },
      );
    }

    if (waiting && running) {
      await Vehicle.updateOne({ _id: waitingVehicle._id }, { $set: { leasedShipmentIds: [waiting._id], leaseAcquiredAt: now } });
      await Vehicle.updateOne({ _id: runningVehicle._id }, { $set: { leasedShipmentIds: [running._id], leaseAcquiredAt: hourAgo } });
    }

    const noticeRows = await Shipment.find({
      shipperId: shipper._id,
      cargoDescription: {
        $in: [
          ...published.map((order) => order.cargoDescription),
          ...awaitingAssignment.map((order) => order.cargoDescription),
          "Rau củ lạnh mát chờ lấy hàng",
          "Thịt bò đông lạnh đang trên đường",
          "Sữa chua lạnh đã giao",
        ],
      },
    }).select("cargoDescription pickupLocation deliveryLocation status driverId carrierId");

    for (const row of noticeRows) {
      const body = orderNoticeBody(row.cargoDescription, row.pickupLocation, row.deliveryLocation);
      const shipmentId = row._id.toString();
      await recordOrderNotice({
        recipientId: shipper._id.toString(),
        shipmentId,
        kind: "PUBLISHED",
        title: "Đăng đơn thành công",
        body,
      });
      if (row.carrierId) {
        await recordOrderNotice({
          recipientId: shipper._id.toString(),
          shipmentId,
          kind: "CLAIMED",
          title: "Đơn đã được nhận",
          body,
        });
        await recordOrderNotice({
          recipientId: row.carrierId.toString(),
          shipmentId,
          kind: "CLAIMED",
          title: "Bạn đã nhận chuyến",
          body,
        });
      }
      if (row.driverId) {
        await recordOrderNotice({
          recipientId: row.driverId.toString(),
          shipmentId,
          kind: "ASSIGNED",
          title: "Bạn được giao chuyến",
          body,
        });
      }
    }

    console.log(
      `Seeded marketplace and driver trips on ${databaseName}. ${awaitingAssignment.length} trips awaiting assignment. Sample ${claimedSampleId ?? "missing"}.`,
    );
  }
} finally {
  await disconnectDatabase();
}

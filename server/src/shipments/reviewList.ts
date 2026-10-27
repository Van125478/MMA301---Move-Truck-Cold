import { isValidObjectId } from "mongoose";
import type { Actor } from "../incidents/access.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { Shipment } from "../models/shipment.js";
import { ShipmentReview } from "../models/shipmentReview.js";
import { groupReviews, toMobileReview } from "../mobile/present.js";

export async function listVisibleReviews(actor: Actor, shipmentId: string) {
  if (!isValidObjectId(shipmentId)) throw new HttpError(404, "not_found", "Không tìm thấy đơn.");
  const shipment = await Shipment.findById(shipmentId).select("shipperId carrierId driverId status");
  if (!shipment || !canRead(actor, shipment)) throw new HttpError(404, "not_found", "Không tìm thấy đơn.");
  const reviews = await ShipmentReview.find({ shipmentId: shipment._id }).sort({ createdAt: -1, _id: -1 });
  return {
    reviews: reviews.map((review) => toMobileReview(review)),
    total: reviews.length,
    groups: groupReviews(reviews),
  };
}

function canRead(
  actor: Actor,
  shipment: {
    shipperId: { toString(): string };
    carrierId?: { toString(): string } | null;
    driverId?: { toString(): string } | null;
    status: string;
  },
): boolean {
  if (actor.role === "SHIPPER") return shipment.shipperId.toString() === actor.id;
  if (actor.role === "CARRIER") {
    const open = shipment.status === "PUBLISHED" && shipment.carrierId == null;
    return open || shipment.carrierId?.toString() === actor.id;
  }
  if (actor.role === "DRIVER") return shipment.driverId?.toString() === actor.id;
  return false;
}

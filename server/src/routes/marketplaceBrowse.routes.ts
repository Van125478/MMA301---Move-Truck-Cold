import { Router } from "express";
import { Shipment } from "../models/shipment.js";
import { compareMarketplaceShipments, marketplaceFilter, readMarketplaceQuery } from "../shipments/marketplaceQuery.js";
import { toShipmentViews } from "../shipments/assignmentView.js";
import type { ShipmentDto } from "../shipments/shipmentDto.js";

export const marketplaceBrowseRouter = Router();

/** Thẻ sàn công khai — không lộ email/điện thoại liên hệ. */
function toPublicBrowseCard(dto: ShipmentDto) {
  return {
    id: dto.id,
    cargoDescription: dto.cargoDescription,
    pickupCompany: dto.pickupCompany,
    pickupLocation: dto.pickupLocation,
    pickupContactName: null,
    pickupPhone: null,
    pickupEmail: null,
    pickupDate: dto.pickupDate,
    pickupTimeFrom: dto.pickupTimeFrom,
    pickupTimeTo: dto.pickupTimeTo,
    deliveryCompany: dto.deliveryCompany,
    deliveryLocation: dto.deliveryLocation,
    deliveryContactName: null,
    deliveryPhone: null,
    deliveryEmail: null,
    deliveryDate: dto.deliveryDate,
    deliveryTimeFrom: dto.deliveryTimeFrom,
    deliveryTimeTo: dto.deliveryTimeTo,
    cargoWeightTon: dto.cargoWeightTon,
    cargoVolumeM3: dto.cargoVolumeM3,
    packageCount: dto.packageCount,
    temperatureGroup: dto.temperatureGroup,
    temperatureLabel: dto.temperatureLabel,
    vehicleRequirement: dto.vehicleRequirement,
    listedPriceVnd: dto.listedPriceVnd,
    status: dto.status,
    statusLabel: dto.statusLabel,
    carrierId: dto.carrierId,
    vehicleId: dto.vehicleId,
    driverId: dto.driverId,
    vehicleLabel: dto.vehicleLabel,
    driverName: dto.driverName,
    pickupConfirmedAt: dto.pickupConfirmedAt,
    deliveryConfirmedAt: dto.deliveryConfirmedAt,
    nextAction: null,
    timeline: { events: [] },
  };
}

marketplaceBrowseRouter.get("/shipments", async (request, response, next) => {
  try {
    const parsed = readMarketplaceQuery(request.query as Record<string, unknown>);
    const filter = marketplaceFilter(parsed);
    const matched = await Shipment.find(filter).limit(500);
    matched.sort(compareMarketplaceShipments(parsed.sort));
    const page = matched.slice(0, 100);
    const views = await toShipmentViews(page);
    response.status(200).json({
      shipments: views.map(toPublicBrowseCard),
      total: matched.length,
      shown: page.length,
    });
  } catch (error) {
    next(error);
  }
});

import { memo } from "react";
import { cargoHeroImage } from "../../utils/cargoHeroImage";
import { formatPickupShort } from "../../utils/format";
import type { Shipment } from "../../types/shipment";
import { FreightListCard, type FreightCardModel } from "./FreightListCard";

type CardProps = {
  shipment: Shipment;
  saved: boolean;
  onOpen: () => void;
  onToggleFavorite?: () => void;
};

function vehicleLine(shipment: Shipment): string | null {
  const parts: string[] = [];
  if (shipment.vehicleRequirement.trim()) parts.push(shipment.vehicleRequirement);
  else parts.push("Xe lạnh");
  if (shipment.cargoWeightTon != null) parts.push(`${shipment.cargoWeightTon} tấn`);
  else if (shipment.temperatureLabel) parts.unshift(shipment.temperatureLabel);
  return parts.length ? parts.join(" · ") : null;
}

function toModel(shipment: Shipment): FreightCardModel {
  return {
    displayCode: shipment.id.length <= 8 ? `#${shipment.id}` : `#${shipment.id.slice(-6).toUpperCase()}`,
    status: shipment.status,
    statusLabel: shipment.statusLabel,
    cargoDescription: shipment.cargoDescription,
    pickupLocation: shipment.pickupLocation,
    deliveryLocation: shipment.deliveryLocation,
    pickupAt: formatPickupShort(shipment.pickupDate, shipment.pickupTimeFrom, shipment.pickupTimeTo),
    vehicleLine: vehicleLine(shipment),
    listedPriceVnd: shipment.listedPriceVnd,
    imageSource: cargoHeroImage(shipment.temperatureGroup, shipment.status),
  };
}

function Card({ shipment, saved, onOpen, onToggleFavorite }: CardProps) {
  return (
    <FreightListCard
      variant="list"
      model={toModel(shipment)}
      saved={saved}
      onPress={onOpen}
      onToggleFavorite={onToggleFavorite}
    />
  );
}

export const ShipmentCard = memo(Card);

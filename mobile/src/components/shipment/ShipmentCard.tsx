import { memo, type ReactNode } from "react";
import { vehicleKindLabel } from "../../utils/catalog";
import { cargoHeroImage } from "../../utils/cargoHeroImage";
import { formatPickupShort } from "../../utils/format";
import type { Shipment } from "../../types/shipment";
import { FreightListCard, type FreightCardModel } from "./FreightListCard";

type CardProps = {
  shipment: Shipment;
  saved: boolean;
  onOpen: () => void;
  onToggleFavorite?: () => void;
  appendBody?: ReactNode;
};

function vehicleLine(shipment: Shipment): string | null {
  const kind = vehicleKindLabel(shipment.temperatureGroup);
  const requirement = shipment.vehicleRequirement.trim();
  const generic = requirement.length === 0 || requirement === "Xe lạnh" || requirement === "Xe đông" || requirement === "Xe cực lạnh";
  const parts = [kind];
  if (shipment.cargoWeightTon != null) parts.push(`${shipment.cargoWeightTon} tấn`);
  if (!generic) parts.push(requirement);
  return parts.join(" · ");
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

function Card({ shipment, saved, onOpen, onToggleFavorite, appendBody }: CardProps) {
  return (
    <FreightListCard
      variant="list"
      model={toModel(shipment)}
      saved={saved}
      onPress={onOpen}
      onToggleFavorite={onToggleFavorite}
      appendBody={appendBody}
    />
  );
}

export const ShipmentCard = memo(Card);

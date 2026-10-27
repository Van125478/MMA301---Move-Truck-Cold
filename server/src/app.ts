import cors from "cors";
import express from "express";
import helmet from "helmet";
import { getEnv } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { requireAuth } from "./middlewares/requireAuth.js";
import { requireRole } from "./middlewares/requireRole.js";
import { authRouter } from "./routes/auth.routes.js";
import { carrierFleetRouter } from "./routes/carrierFleet.routes.js";
import { carrierConversationRouter } from "./routes/carrierConversation.routes.js";
import { carrierShipmentRouter } from "./routes/carrierShipment.routes.js";
import { driverShipmentRouter } from "./routes/driverShipment.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { incidentRouter } from "./routes/incident.routes.js";
import { shipmentChatRouter } from "./routes/shipmentChat.routes.js";
import { packageRouter } from "./routes/package.routes.js";
import { commissionRouter } from "./routes/commission.routes.js";
import { cargoImageRouter } from "./routes/cargoImage.routes.js";
import { incidentEvidenceRouter } from "./routes/incidentEvidence.routes.js";
import { oilPriceRouter } from "./routes/oilPrice.routes.js";
import { fuelMarketRouter } from "./routes/fuelMarket.routes.js";
import { mobileRouter } from "./routes/mobile.routes.js";
import { marketplaceBrowseRouter } from "./routes/marketplaceBrowse.routes.js";
import { orderNoticeRouter } from "./routes/orderNotice.routes.js";
import { shipmentReviewRouter } from "./routes/shipmentReview.routes.js";
import { shipmentRouter } from "./routes/shipment.routes.js";

export function createApp() {
  const env = getEnv();
  const app = express();

  app.disable("x-powered-by");
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/health", healthRouter);
  app.use("/api/packages", packageRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/cargo-images", cargoImageRouter);
  app.use("/api/incident-evidence", incidentEvidenceRouter);
  app.use("/api/shipments", shipmentRouter);
  app.use("/api/mobile", mobileRouter);
  app.use("/api/commission", commissionRouter);
  app.use("/api/shipments", shipmentChatRouter);
  app.use("/api/carrier/shipments", carrierShipmentRouter);
  app.use("/api/carrier/conversations", carrierConversationRouter);
  app.use("/api/carrier/fleet", carrierFleetRouter);
  app.use("/api/driver/shipments", driverShipmentRouter);
  app.use("/api/incidents", incidentRouter);
  app.use("/api/market/oil-prices", oilPriceRouter);
  app.use("/api/market/fuel", fuelMarketRouter);
  app.use("/api/marketplace", marketplaceBrowseRouter);
  app.use("/api/notices", orderNoticeRouter);
  app.use("/api/shipment-reviews", shipmentReviewRouter);
  if (env.NODE_ENV === "test") {
    app.get("/api/test/shipper-only", requireAuth, requireRole("SHIPPER"), (_request, response) => {
      response.status(200).json({ ok: true });
    });
  }
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

import { Router } from "express";
import { confirmFreightPayment, readFreightPayment, recordFreightPayment } from "../freight/payment.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireOperationalSession } from "../middlewares/requireOperational.js";
import { requireTrustedOrigin } from "../middlewares/requireOrigin.js";

export const freightPaymentRouter = Router();

freightPaymentRouter.use(requireAuth, requireOperationalSession);

freightPaymentRouter.get("/:shipmentId", async (request, response, next) => {
  try {
    const actor = request.authUser;
    if (!actor) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
    const payment = await readFreightPayment(paramId(request.params.shipmentId), actor);
    response.status(200).json({ payment });
  } catch (error) {
    next(error);
  }
});

freightPaymentRouter.post("/:shipmentId", requireTrustedOrigin, async (request, response, next) => {
  try {
    const actor = request.authUser;
    if (!actor) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
    const result = await recordFreightPayment(paramId(request.params.shipmentId), actor, request.body);
    response.status(result.created ? 201 : 200).json({ payment: result.payment });
  } catch (error) {
    next(error);
  }
});

freightPaymentRouter.post("/:shipmentId/confirm", requireTrustedOrigin, async (request, response, next) => {
  try {
    const actor = request.authUser;
    if (!actor) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
    const payment = await confirmFreightPayment(paramId(request.params.shipmentId), actor, request.body);
    response.status(200).json({ payment });
  } catch (error) {
    next(error);
  }
});

function paramId(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

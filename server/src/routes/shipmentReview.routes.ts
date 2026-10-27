import { Router } from "express";
import { HttpError } from "../middlewares/errorHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireOperationalSession } from "../middlewares/requireOperational.js";
import type { Actor } from "../incidents/access.js";
import { listVisibleReviews } from "../shipments/reviewList.js";

export const shipmentReviewRouter = Router();

shipmentReviewRouter.use(requireAuth, requireOperationalSession);

shipmentReviewRouter.get("/:shipmentId", async (request, response, next) => {
  try {
    const user = request.authUser;
    if (!user?.id || !user.role) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
    const shipmentId = request.params.shipmentId;
    if (typeof shipmentId !== "string") throw new HttpError(404, "not_found", "Không tìm thấy đơn.");
    const actor: Actor = { id: user.id, role: user.role };
    response.status(200).json(await listVisibleReviews(actor, shipmentId));
  } catch (error) {
    next(error);
  }
});

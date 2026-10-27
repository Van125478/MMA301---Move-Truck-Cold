import { Router } from "express";
import { HttpError } from "../middlewares/errorHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireOperationalSession } from "../middlewares/requireOperational.js";
import { requireTrustedOrigin } from "../middlewares/requireOrigin.js";
import type { Actor } from "../incidents/access.js";
import { deleteOrderNotices, listOrderNotices, markOrderNoticeRead, unreadOrderNoticeCount } from "../orders/notices.js";

export const orderNoticeRouter = Router();

orderNoticeRouter.use(requireAuth, requireOperationalSession);

function actorOf(request: { authUser?: { id: string; role: Actor["role"] } }): Actor {
  const user = request.authUser;
  if (!user?.id || !user.role) throw new HttpError(401, "unauthenticated", "Cần đăng nhập để tiếp tục.");
  return { id: user.id, role: user.role };
}

orderNoticeRouter.get("/unread-count", async (request, response, next) => {
  try {
    response.status(200).json({ unread: await unreadOrderNoticeCount(actorOf(request)) });
  } catch (error) {
    next(error);
  }
});

orderNoticeRouter.get("/", async (request, response, next) => {
  try {
    const actor = actorOf(request);
    response.status(200).json({ notifications: await listOrderNotices(actor.id, actor) });
  } catch (error) {
    next(error);
  }
});

orderNoticeRouter.post("/:id/read", requireTrustedOrigin, async (request, response, next) => {
  try {
    const id = request.params.id;
    if (typeof id !== "string") throw new HttpError(404, "not_found", "Không tìm thấy thông báo này.");
    const actor = actorOf(request);
    const notification = await markOrderNoticeRead(actor.id, id, actor);
    response.status(200).json({ notification });
  } catch (error) {
    next(error);
  }
});

orderNoticeRouter.post("/bulk-delete", requireTrustedOrigin, async (request, response, next) => {
  try {
    const body: unknown = request.body;
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new HttpError(400, "invalid_request", "Danh sách thông báo không hợp lệ.");
    }
    const idsRaw = (body as { ids?: unknown }).ids;
    if (!Array.isArray(idsRaw)) throw new HttpError(400, "invalid_request", "Danh sách thông báo không hợp lệ.");
    const ids = idsRaw.filter((value): value is string => typeof value === "string" && value.length > 0);
    if (ids.length === 0) throw new HttpError(400, "invalid_request", "Chọn ít nhất một thông báo.");
    const actor = actorOf(request);
    await deleteOrderNotices(actor.id, ids, actor);
    response.status(200).json({ ok: true, deleted: ids.length });
  } catch (error) {
    next(error);
  }
});

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { NotificationsService } from "./notifications.service";

const router = Router();
const notificationsService = new NotificationsService();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const items = await notificationsService.listForUser(userId);
    res.json({ ok: true, notifications: items });
  } catch (err) {
    next(err);
  }
});

router.post("/mark-read", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    await notificationsService.markAllRead(userId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

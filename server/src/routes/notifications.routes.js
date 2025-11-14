// routes/notifications.routes.js
// -----------------------------------------------------
// Notifications routes (silo-aware)
// Mounted at: /api/:silo/notifications
// -----------------------------------------------------

import { Router } from "express";
import {
  getNotifications,
  createNotification,
  getNotificationById,
  updateNotification,
  deleteNotification,
} from "../controllers/notificationsController.js";

const router = Router({ mergeParams: true });

// -----------------------------------------------------
// Async wrapper (Express 5-safe)
// -----------------------------------------------------
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// -----------------------------------------------------
// Param validator
// -----------------------------------------------------
router.param("notificationId", (req, res, next, value) => {
  if (!value || typeof value !== "string" || value.length < 6) {
    return res.status(400).json({
      ok: false,
      error: "Invalid notification ID",
      received: value,
    });
  }
  next();
});

// -----------------------------------------------------
// ROUTES
// -----------------------------------------------------

// GET all notifications
router.get("/", wrap(getNotifications));

// CREATE notification
router.post("/", wrap(createNotification));

// GET single notification
router.get("/:notificationId", wrap(getNotificationById));

// UPDATE notification
router.put("/:notificationId", wrap(updateNotification));

// DELETE notification
router.delete("/:notificationId", wrap(deleteNotification));

export default router;

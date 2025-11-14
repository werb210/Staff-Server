// controllers/notificationsController.js
// -----------------------------------------------------
// Notifications controller (silo-aware)
// Backed by in-memory db.notifications
// -----------------------------------------------------

import { db } from "../services/db.js";
import { v4 as uuid } from "uuid";

// -----------------------------------------------------
// Utility — ensure silo exists
// -----------------------------------------------------
function assertSilo(req) {
  const silo = req.params?.silo;
  if (!silo) throw new Error("Missing silo in route parameters");
  return silo;
}

// -----------------------------------------------------
// GET /api/:silo/notifications
// -----------------------------------------------------
export async function getNotifications(req, res) {
  const silo = assertSilo(req);

  const results = db.notifications.data.filter((n) => n.silo === silo);

  res.status(200).json({
    ok: true,
   

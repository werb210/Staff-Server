import { Router } from "express";
import { eq } from "drizzle-orm";

import { verifyDatabaseConnection } from "../db";
import { listRegisteredRoutes } from "../routes/listRoutes";
import { db } from "../db";
import { users } from "../db/schema";
import { passwordService } from "../services/password.service";

const router = Router();

/**
 * GET /api/internal/health
 */
router.get("/health", async (_req, res) => {
  try {
    const dbConnected = await verifyDatabaseConnection();
    const status = dbConnected ? "ok" : "degraded";
    const httpStatus = dbConnected ? 200 : 503;

    res.status(httpStatus).json({
      status,
      dbConnected,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: "staff-server",
      scope: "internal",
    });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      dbConnected: false,
      message: err?.message ?? "Health check failed",
      timestamp: new Date().toISOString(),
      service: "staff-server",
      scope: "internal",
    });
  }
});

/**
 * GET /api/internal/routes
 * Returns a best-effort list of registered routes.
 */
router.get("/routes", (req, res) => {
  try {
    const routes = listRegisteredRoutes(req.app, "");
    res.status(200).json({ status: "ok", routes });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      message: err?.message || "Failed to enumerate routes",
    });
  }
});

/**
 * POST /api/internal/admin/reset-password
 */
router.post("/admin/reset-password", async (req, res) => {
  const providedToken = req.header("x-admin-reset-token");
  const expectedToken = process.env.ADMIN_RESET_TOKEN;

  if (!providedToken || !expectedToken || providedToken !== expectedToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const newPassword = String(req.body?.newPassword ?? "");

  if (!email || !newPassword) {
    return res.status(400).json({ error: "Email and newPassword are required" });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const hashedPassword = await passwordService.hashPassword(newPassword);

  await db
    .update(users)
    .set({ passwordHash: hashedPassword })
    .where(eq(users.email, email));

  return res.status(200).json({ ok: true });
});

export default router;

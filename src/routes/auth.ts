import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import { startOtp, verifyOtpCode } from "../modules/auth/otp.service";
import { requireAuth, requireAuthorization } from "../middleware/auth";
import { notFoundHandler } from "../middleware/errors";
import { errorHandler } from "../middleware/errorHandler";
import { authMeHandler } from "./auth/me";
import { ALL_ROLES } from "../auth/roles";
import { normalizePhone } from "../utils/phoneNormalizer";
import { createOtpSessionsTable } from "../db/migrations/createOtpSessions";

const router = Router();

router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.post("/otp/request", async (req, res) => {
  try {
    const rawPhone = req.body?.phone;
    const phone = normalizePhone(typeof rawPhone === "string" ? rawPhone : "");

    if (!phone) {
      return res.status(400).json({ error: "phone_required" });
    }

    await createOtpSessionsTable();
    await startOtp(phone);

    return res.json({
      success: true,
    });
  } catch (err) {
    console.error("OTP request failed", err);
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "otp_request_failed",
    });
  }
});

router.post("/otp/verify", async (req, res) => {
  try {
    const phone = normalizePhone(String(req.body.phone ?? ""));
    const code = String(req.body.code ?? "").trim();

    if (!phone || !code) {
      return res.status(400).json({
        ok: false,
        error: "missing_fields",
      });
    }

    const result = await verifyOtpCode({
      phone,
      code,
      ip: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
      route: req.originalUrl,
      method: req.method,
    });

    if (!result.ok) {
      return res.status(400).json({
        ok: false,
        error: "invalid_otp",
      });
    }

    return res.json({
      ok: true,
      data: {
        sessionToken: result.sessionToken,
        nextPath: "/application/start",
      },
      error: null,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "otp_verify_failed",
    });
  }
});

/**
 * GET /api/auth/me
 * - Auth required
 * - Uses canonical auth wrapper
 */
router.get(
  "/me",
  requireAuth,
  requireAuthorization({ roles: ALL_ROLES }),
  authMeHandler
);

/**
 * OTP + authentication flows
 * These routes manage their own auth semantics internally
 */
router.use("/", authRoutes);

/**
 * Terminal handlers
 */
router.use(notFoundHandler);
router.use(errorHandler);

export default router;

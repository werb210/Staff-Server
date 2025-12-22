import { Router } from "express";
import { assertDatabaseConnection, verifyDatabaseConnection } from "../db";
import { authHealthCheck } from "../services/health.service.js";
const router = Router();
router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
router.get("/health/db", async (_req, res) => {
    try {
        await assertDatabaseConnection();
        const ok = await verifyDatabaseConnection();
        return res.json({ status: ok ? "ok" : "fail" });
    }
    catch (error) {
        return res.status(503).json({ status: "fail", error: error.message });
    }
});
router.get("/health/auth", (_req, res) => {
    const result = authHealthCheck();
    const statusCode = result.status === "ok" ? 200 : 503;
    return res.status(statusCode).json(result);
});
export default router;

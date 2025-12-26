import { Router } from "express";
const router = Router();
/**
 * Minimal CRM surface so /api/crm stops 404ing.
 * You can expand these later; this is to prove routing + deployment.
 */
router.get("/", (_req, res) => {
    res.json({ ok: true, module: "crm" });
});
router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
// Placeholders that won’t crash the portal if it probes them
router.get("/contacts", (_req, res) => res.json([]));
router.get("/companies", (_req, res) => res.json([]));
router.get("/deals", (_req, res) => res.json([]));
router.get("/tasks", (_req, res) => res.json([]));
router.get("/activity", (_req, res) => res.json([]));
export default router;

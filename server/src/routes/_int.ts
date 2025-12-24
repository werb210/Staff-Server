import { Router } from "express";
import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => res.json({ ok: true }));
router.get("/build", (_req, res) => res.json({ status: "build-ok" }));
router.get("/routes", (_req, res) => res.json({ status: "routes-ok" }));

export default router;

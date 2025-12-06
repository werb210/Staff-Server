import { Router } from "express";
import authController from "../controllers/authController";

const router = Router();

// Simple root + health for smoke tests
router.get("/", (_req, res) => {
  res.json({ ok: true, message: "Staff Server API root" });
});

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Auth endpoints
router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);

// Extend later with real CRM routes (contacts, companies, etc.)
export default router;

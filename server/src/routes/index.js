// routes/index.js
// ---------------------------------------------------------
// Main API Router
// Mounted at: /api
// ---------------------------------------------------------

import { Router } from "express";

import authRouter from "./auth.js";
import contactsRouter from "./contacts.js";
import companiesRouter from "./companies.js";
import dealsRouter from "./deals.js";
import documentsRouter from "./documents.js";
import pipelineRouter from "./pipeline.routes.js";
import communicationRouter from "./communication.js";
import aiRouter from "./ai.routes.js";

import { authMiddleware } from "../middlewares/index.js";

const router = Router();

// ---------------------------------------
// PUBLIC ROUTES
// ---------------------------------------
router.use("/auth", authRouter);

// ---------------------------------------
// PROTECTED ROUTES
// ---------------------------------------
router.use(authMiddleware);

router.use("/contacts", contactsRouter);
router.use("/companies", companiesRouter);
router.use("/deals", dealsRouter);
router.use("/documents", documentsRouter);

// Silo-aware routes mounted externally: /api/:silo/*
router.use("/comm", communicationRouter);
router.use("/ai", aiRouter);

// Pipeline routes (NOT siloed here)
// Siloed pipeline is mounted outside in app.js as /api/pipeline
router.use("/pipeline", pipelineRouter);

// Default /api root
router.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Boreal Staff API root",
  });
});

export default router;

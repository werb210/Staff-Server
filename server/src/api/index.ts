// server/src/api/index.ts

import { Router } from "express";

import aiRoutes from "./ai";
import analysisRoutes from "./analysis";
import authRoutes from "./auth";
import bankingRoutes from "./banking";
import documentRoutes from "./documents";
import internalRoutes from "./internal.routes";
import lenderRoutes from "./lenders";
import ocrRoutes from "./ocr";
import pipelineRoutes from "./pipeline";
import productRoutes from "./products";
import userRoutes from "./users";

const router = Router();

// Core API modules
router.use("/ai", aiRoutes);
router.use("/analysis", analysisRoutes);
router.use("/auth", authRoutes);
router.use("/banking", bankingRoutes);
router.use("/documents", documentRoutes);
router.use("/lenders", lenderRoutes);
router.use("/ocr", ocrRoutes);
router.use("/pipeline", pipelineRoutes);
router.use("/products", productRoutes);
router.use("/users", userRoutes);

// Health endpoints (no auth)
router.use("/internal", internalRoutes); // /api/internal/health
router.use("/public", internalRoutes);   // /api/public/health

export default router;

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
import protectedRoutes from "./protected";
import userRoutes from "./users";

const router = Router();

// Public health endpoint for Azure liveness / external checks
router.get("/public/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Mount all API modules
router.use("/ai", aiRoutes);
router.use("/analysis", analysisRoutes);
router.use("/auth", authRoutes);
router.use("/banking", bankingRoutes);
router.use("/documents", documentRoutes);
router.use("/internal", internalRoutes);
router.use("/lenders", lenderRoutes);
router.use("/ocr", ocrRoutes);
router.use("/pipeline", pipelineRoutes);
router.use("/products", productRoutes);
router.use("/protected", protectedRoutes);
router.use("/users", userRoutes);

export default router;

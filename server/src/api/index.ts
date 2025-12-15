import { Router } from "express";

import { config } from "../config/config";
import { listRegisteredRoutes } from "../routes/listRoutes";
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

if (config.NODE_ENV !== "production") {
  router.get("/_debug/routes", (req, res) => {
    const routes = listRegisteredRoutes(req.app, "");
    res.json({ routes });
  });

  router.get("/_debug/env", (_req, res) => {
    const envVars = Object.keys(process.env)
      .sort()
      .reduce<Record<string, string>>((acc, key) => {
        const value = process.env[key];
        acc[key] = typeof value === "string" && value.length > 0 ? "[masked]" : "";
        return acc;
      }, {});

    res.json({
      environment: config.NODE_ENV,
      variables: envVars,
    });
  });
}

export default router;

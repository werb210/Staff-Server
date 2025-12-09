import { Router } from "express";
import authRouter from "./auth";
import usersRouter from "./users";
import applicationsRouter from "./applications";
import documentsRouter from "./documents";
import lendersRouter from "./lenders";
import productsRouter from "./products";
import ocrRouter from "./ocr";
import analysisRouter from "./analysis";
import pipelineRouter from "./pipeline";
import internalRouter from "./internal";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/applications", applicationsRouter);
router.use("/documents", documentsRouter);
router.use("/lenders", lendersRouter);
router.use("/products", productsRouter);
router.use("/ocr", ocrRouter);
router.use("/analysis", analysisRouter);
router.use("/pipeline", pipelineRouter);
router.use("/_int", internalRouter);

router.get("/", (_req, res) => {
  res.json({ ok: true, message: "Staff Server API" });
});

export default router;

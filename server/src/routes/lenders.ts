import { Router } from "express";
import {
  CreateLenderProductSchema,
  CreateLenderSchema,
  LenderReportRequestSchema,
  SendToLenderSchema,
} from "../schemas/lenderSchemas.js";
import { lendersService } from "../services/lendersService.js";
import { logInfo } from "../utils/logger.js";
import { parseWithSchema } from "../utils/validation.js";

const router = Router();

router.get("/", (_req, res, next) => {
  try {
    logInfo("GET /api/lenders");
    const lenders = lendersService.listLenders();
    res.json({ message: "OK", data: lenders });
  } catch (error) {
    next(error);
  }
});

router.post("/", (req, res, next) => {
  try {
    logInfo("POST /api/lenders", req.body);
    const payload = parseWithSchema(CreateLenderSchema, req.body);
    const lender = lendersService.createLender({ ...payload, products: payload.products ?? [] });
    res.status(201).json({ message: "OK", data: lender });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", (req, res, next) => {
  try {
    logInfo("GET /api/lenders/:id", { id: req.params.id });
    const lender = lendersService.getLender(req.params.id);
    res.json({ message: "OK", data: lender });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", (req, res, next) => {
  try {
    logInfo("PUT /api/lenders/:id", { id: req.params.id, body: req.body });
    const payload = parseWithSchema(CreateLenderSchema.partial(), req.body);
    const lender = lendersService.updateLender(req.params.id, payload);
    res.json({ message: "OK", data: lender });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", (req, res, next) => {
  try {
    logInfo("DELETE /api/lenders/:id", { id: req.params.id });
    const removed = lendersService.deleteLender(req.params.id);
    res.json({ message: "OK", removed });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/products", (req, res, next) => {
  try {
    logInfo("GET /api/lenders/:id/products", { id: req.params.id });
    const products = lendersService.listProducts(req.params.id);
    res.json({ message: "OK", data: products });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/products", (req, res, next) => {
  try {
    logInfo("POST /api/lenders/:id/products", { id: req.params.id, body: req.body });
    const payload = parseWithSchema(CreateLenderProductSchema, req.body);
    const product = lendersService.addProduct(req.params.id, payload);
    res.status(201).json({ message: "OK", data: product });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/products/:productId", (req, res, next) => {
  try {
    logInfo("DELETE /api/lenders/:id/products/:productId", req.params);
    const removed = lendersService.removeProduct(req.params.id, req.params.productId);
    res.json({ message: "OK", removed });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/send", (req, res, next) => {
  try {
    logInfo("POST /api/lenders/:id/send", { id: req.params.id, body: req.body });
    const payload = parseWithSchema(SendToLenderSchema, { ...req.body, lenderId: req.params.id });
    const result = lendersService.sendToLender(payload);
    res.json({ message: "OK", data: result });
  } catch (error) {
    next(error);
  }
});

router.post("/reports", (req, res, next) => {
  try {
    logInfo("POST /api/lenders/reports", req.body);
    const payload = parseWithSchema(LenderReportRequestSchema, req.body);
    const report = lendersService.generateReport(payload);
    res.json({ message: "OK", data: report });
  } catch (error) {
    next(error);
  }
});

export default router;

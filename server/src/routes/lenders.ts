import { Router } from "express";
import { z } from "zod";
import {
  LenderCreateSchema,
  LenderProductCreateSchema,
  LenderProductUpdateSchema,
  LenderUpdateSchema,
} from "../schemas/lenderProduct.schema.js";
import { isPlaceholderSilo, respondWithPlaceholder } from "../utils/placeholder.js";

const router = Router();

router.get("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const lenders = req.silo!.services.lenders.listLenders();
  res.json({ message: "OK", data: lenders });
});

router.post("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const parsed = LenderCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid lender payload" });
  }
  const lender = req.silo!.services.lenders.createLender(parsed.data);
  res.status(201).json({ message: "OK", data: lender });
});

router.put("/:id", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const parsed = LenderUpdateSchema.safeParse({ ...req.body, id: req.params.id });
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid lender update" });
  }
  const { id, ...updates } = parsed.data;
  const lender = req.silo!.services.lenders.updateLender(id, updates);
  res.json({ message: "OK", data: lender });
});

router.delete("/:id", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ message: "Invalid lender id" });
  }
  req.silo!.services.lenders.deleteLender(id.data);
  res.json({ message: "OK" });
});

router.get("/:id/products", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ message: "Invalid lender id" });
  }
  const products = req.silo!.services.lenders.listProducts(id.data);
  res.json({ message: "OK", data: products });
});

router.post("/:id/products", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const parsed = LenderProductCreateSchema.safeParse({
    ...req.body,
    lenderId: req.params.id,
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid lender product payload" });
  }
  const product = req.silo!.services.lenders.createProduct(parsed.data);
  res.status(201).json({ message: "OK", data: product });
});

router.put("/products/:id", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const parsed = LenderProductUpdateSchema.safeParse({ ...req.body, id: req.params.id });
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid product update" });
  }
  const { id, ...updates } = parsed.data;
  const product = req.silo!.services.lenders.updateProduct(id, updates);
  res.json({ message: "OK", data: product });
});

router.delete("/products/:id", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ message: "Invalid product id" });
  }
  req.silo!.services.lenders.deleteProduct(id.data);
  res.json({ message: "OK" });
});

router.post("/:id/send", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const payload = z
    .object({
      applicationId: z.string().uuid(),
    })
    .safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Invalid send payload" });
  }
  const report = req.silo!.services.lenders.sendToLender(
    payload.data.applicationId,
    req.params.id,
  );
  res.json({ message: "OK", data: report });
});

router.get("/reports/summary", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const reports = req.silo!.services.lenders.generateReports();
  res.json({ message: "OK", data: reports });
});

export default router;

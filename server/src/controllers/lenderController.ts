import type { Request, Response } from "express";
import {
  lenderService,
  type LenderServiceType,
} from "../services/lenderService.js";

import {
  LenderCreateSchema,
  LenderUpdateSchema,
  LenderProductCreateSchema,
  LenderProductUpdateSchema,
} from "../schemas/lenderProduct.schema.js";

/* ------------------------------------------------------------------
   Controller Helpers
------------------------------------------------------------------- */

const service: LenderServiceType = lenderService;

/* ------------------------------------------------------------------
   LENDERS
------------------------------------------------------------------- */

export const listLenders = (_req: Request, res: Response) => {
  const lenders = service.listLenders();
  res.json(lenders);
};

export const getLender = (req: Request, res: Response) => {
  try {
    const lender = service.getLender(req.params.id);
    res.json(lender);
  } catch (err) {
    res.status(404).json({ message: (err as Error).message });
  }
};

export const createLender = (req: Request, res: Response) => {
  const parsed = LenderCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid lender payload" });
  }
  const lender = service.createLender(parsed.data);
  res.status(201).json(lender);
};

export const updateLender = (req: Request, res: Response) => {
  const parsed = LenderUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid lender payload" });
  }

  try {
    const updated = service.updateLender(req.params.id, parsed.data);
    res.json(updated);
  } catch (err) {
    res.status(404).json({ message: (err as Error).message });
  }
};

export const deleteLender = (req: Request, res: Response) => {
  try {
    service.deleteLender(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(404).json({ message: (err as Error).message });
  }
};

/* ------------------------------------------------------------------
   PRODUCTS
------------------------------------------------------------------- */

export const listProducts = (req: Request, res: Response) => {
  const list = service.listProducts(req.params.lenderId);
  res.json(list);
};

export const createProduct = (req: Request, res: Response) => {
  const parsed = LenderProductCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid product payload" });
  }

  try {
    const created = service.createProduct(parsed.data);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const updateProduct = (req: Request, res: Response) => {
  const parsed = LenderProductUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid product payload" });
  }

  try {
    const updated = service.updateProduct(req.params.id, parsed.data);
    res.json(updated);
  } catch (err) {
    res.status(404).json({ message: (err as Error).message });
  }
};

export const deleteProduct = (req: Request, res: Response) => {
  try {
    service.deleteProduct(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(404).json({ message: (err as Error).message });
  }
};

/* ------------------------------------------------------------------
   SEND TO LENDER
------------------------------------------------------------------- */

export const sendToLender = (req: Request, res: Response) => {
  try {
    const report = service.sendToLender(
      req.params.applicationId,
      req.params.lenderId
    );
    res.json(report);
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

/* ------------------------------------------------------------------
   REPORTS
------------------------------------------------------------------- */

export const generateReports = (_req: Request, res: Response) => {
  const reports = service.generateReports();
  res.json(reports);
};

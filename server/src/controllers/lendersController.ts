import { Request, Response } from "express";
import {
  listLenders as svcListLenders,
  createLender as svcCreateLender,
  updateLender as svcUpdateLender,
  deleteLender as svcDeleteLender,
  getLenderProducts as svcGetLenderProducts,
  createLenderProduct as svcCreateLenderProduct,
} from "../services/lenders/lenderService.js";

/**
 * GET /lenders
 */
export async function listLenders(req: Request, res: Response) {
  try {
    const lenders = await svcListLenders();
    return res.json({ lenders });
  } catch (err: any) {
    console.error("listLenders error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /lenders
 */
export async function createLender(req: Request, res: Response) {
  try {
    const lender = await svcCreateLender(req.body);
    return res.status(201).json(lender);
  } catch (err: any) {
    console.error("createLender error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * PUT /lenders/:lenderId
 */
export async function updateLender(req: Request, res: Response) {
  try {
    const lenderId = req.params.lenderId;
    const lender = await svcUpdateLender(lenderId, req.body);
    return res.json(lender);
  } catch (err: any) {
    console.error("updateLender error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * DELETE /lenders/:lenderId
 */
export async function deleteLender(req: Request, res: Response) {
  try {
    const lenderId = req.params.lenderId;
    await svcDeleteLender(lenderId);
    return res.json({ success: true });
  } catch (err: any) {
    console.error("deleteLender error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /lenders/:lenderId/products
 */
export async function getLenderProducts(req: Request, res: Response) {
  try {
    const lenderId = req.params.lenderId;
    const products = await svcGetLenderProducts(lenderId);
    return res.json({ products });
  } catch (err: any) {
    console.error("getLenderProducts error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /lenders/:lenderId/products
 */
export async function createLenderProduct(req: Request, res: Response) {
  try {
    const lenderId = req.params.lenderId;
    const product = await svcCreateLenderProduct(lenderId, req.body);
    return res.status(201).json(product);
  } catch (err: any) {
    console.error("createLenderProduct error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default {
  listLenders,
  createLender,
  updateLender,
  deleteLender,
  getLenderProducts,
  createLenderProduct,
};

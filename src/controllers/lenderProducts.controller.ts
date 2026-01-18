import { type Request, type Response } from "express";
import { AppError } from "../middleware/errors";
import {
  createLenderProduct,
  listLenderProducts,
  type LenderProductRecord,
} from "../repositories/lenderProducts.repo";
import { getLenderById } from "../repositories/lenders.repo";

export type LenderProductResponse = {
  id: string;
  lenderId: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toLenderProductResponse(record: LenderProductRecord): LenderProductResponse {
  return {
    id: record.id,
    lenderId: record.lender_id,
    name: record.name,
    description: record.description,
    active: record.active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function listLenderProductsHandler(
  _req: Request,
  res: Response
): Promise<void> {
  const products = await listLenderProducts();
  res.status(200).json(products.map(toLenderProductResponse));
}

export async function createLenderProductHandler(
  req: Request,
  res: Response
): Promise<void> {
  const { lenderId, name, description, active } = req.body ?? {};
  if (typeof lenderId !== "string" || lenderId.trim().length === 0) {
    throw new AppError("validation_error", "lenderId is required.", 400);
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new AppError("validation_error", "name is required.", 400);
  }
  const lender = await getLenderById(lenderId.trim());
  if (!lender) {
    throw new AppError("not_found", "Lender not found.", 404);
  }
  const created = await createLenderProduct({
    lenderId: lenderId.trim(),
    name: name.trim(),
    description: typeof description === "string" ? description.trim() : null,
    active: typeof active === "boolean" ? active : true,
  });
  res.status(201).json(toLenderProductResponse(created));
}

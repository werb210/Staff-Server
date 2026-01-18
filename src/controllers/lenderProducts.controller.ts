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

function assertLenderProductRecord(record: LenderProductRecord): void {
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.lender_id !== "string" ||
    typeof record.name !== "string" ||
    typeof record.active !== "boolean" ||
    !(record.created_at instanceof Date) ||
    !(record.updated_at instanceof Date)
  ) {
    throw new AppError("data_error", "Invalid lender product record.", 500);
  }
}

export async function listLenderProductsHandler(
  req: Request,
  res: Response
): Promise<void> {
  const activeOnly = req.query.active === "true";
  try {
    const products = await listLenderProducts({ activeOnly });
    if (!Array.isArray(products)) {
      res.status(200).json({ items: [] });
      return;
    }
    products.forEach(assertLenderProductRecord);
    res.status(200).json({ items: products.map(toLenderProductResponse) });
  } catch (err) {
    res.status(200).json({ items: [] });
  }
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
  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    throw new AppError("validation_error", "description must be a string.", 400);
  }
  if (active !== undefined && typeof active !== "boolean") {
    throw new AppError("validation_error", "active must be a boolean.", 400);
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

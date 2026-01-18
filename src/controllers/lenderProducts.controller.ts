import { type Request, type Response } from "express";
import { AppError } from "../middleware/errors";
import {
  createLenderProduct,
  listLenderProducts,
  updateLenderProductRequiredDocuments,
} from "../repositories/lenderProducts.repo";
import {
  type LenderProductRecord,
  type RequiredDocument,
} from "../db/schema/lenderProducts";
import { getLenderById } from "../repositories/lenders.repo";

export type LenderProductResponse = {
  id: string;
  lenderId: string;
  name: string;
  description: string | null;
  active: boolean;
  required_documents: RequiredDocument[];
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
    required_documents: record.required_documents,
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
    !Array.isArray(record.required_documents) ||
    !(record.created_at instanceof Date) ||
    !(record.updated_at instanceof Date)
  ) {
    throw new AppError("data_error", "Invalid lender product record.", 500);
  }
}

function parseRequiredDocuments(
  value: unknown,
  options?: { allowUndefined?: boolean }
): RequiredDocument[] {
  if (value === undefined) {
    if (options?.allowUndefined) {
      return [];
    }
    throw new AppError("validation_error", "required_documents is required.", 400);
  }
  if (!Array.isArray(value)) {
    throw new AppError(
      "validation_error",
      "required_documents must be an array.",
      400
    );
  }
  return value.map((item) => {
    if (!item || typeof item !== "object") {
      throw new AppError(
        "validation_error",
        "required_documents items must be objects.",
        400
      );
    }
    const category = (item as { category?: unknown }).category;
    const required = (item as { required?: unknown }).required;
    const description = (item as { description?: unknown }).description;
    if (typeof category !== "string" || category.trim().length === 0) {
      throw new AppError(
        "validation_error",
        "required_documents category is required.",
        400
      );
    }
    if (typeof required !== "boolean") {
      throw new AppError(
        "validation_error",
        "required_documents required must be a boolean.",
        400
      );
    }
    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      throw new AppError(
        "validation_error",
        "required_documents description must be a string.",
        400
      );
    }
    const normalizedDescription =
      typeof description === "string" ? description.trim() : undefined;
    return {
      category: category.trim(),
      required,
      ...(normalizedDescription ? { description: normalizedDescription } : {}),
    };
  });
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
  const {
    lenderId,
    name,
    description,
    active,
    required_documents,
    requiredDocuments,
  } = req.body ?? {};
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
  const requiredDocumentsList = parseRequiredDocuments(
    required_documents ?? requiredDocuments,
    { allowUndefined: true }
  );
  const lender = await getLenderById(lenderId.trim());
  if (!lender) {
    throw new AppError("not_found", "Lender not found.", 404);
  }
  const created = await createLenderProduct({
    lenderId: lenderId.trim(),
    name: name.trim(),
    description: typeof description === "string" ? description.trim() : null,
    active: typeof active === "boolean" ? active : true,
    requiredDocuments: requiredDocumentsList,
  });
  // Portal contract: POST /api/lender-products returns the created lender product object.
  res.status(201).json(toLenderProductResponse(created));
}

export async function updateLenderProductHandler(
  req: Request,
  res: Response
): Promise<void> {
  const { id } = req.params;
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new AppError("validation_error", "id is required.", 400);
  }
  const { required_documents, requiredDocuments } = req.body ?? {};
  const requiredDocumentsList = parseRequiredDocuments(
    required_documents ?? requiredDocuments
  );
  const updated = await updateLenderProductRequiredDocuments({
    id: id.trim(),
    requiredDocuments: requiredDocumentsList,
  });
  if (!updated) {
    throw new AppError("not_found", "Lender product not found.", 404);
  }
  res.status(200).json(toLenderProductResponse(updated));
}

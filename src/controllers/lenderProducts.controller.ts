import { type Request, type Response } from "express";
import { AppError } from "../middleware/errors";
import {
  createLenderProductService,
  listLenderProductsService,
  updateLenderProductService,
} from "../services/lenderProductsService";
import { type LenderProductRecord, type RequiredDocument } from "../db/schema/lenderProducts";
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

function toLenderProductResponse(
  record: LenderProductRecord
): LenderProductResponse {
  assertLenderProductRecord(record);
  const normalizedDocuments = normalizeRequiredDocuments(
    record.required_documents
  );

  return {
    id: record.id,
    lenderId: record.lender_id,
    name: record.name,
    description: record.description,
    active: record.active,
    required_documents: normalizedDocuments,
    createdAt: parseTimestamp(record.created_at, "created_at"),
    updatedAt: parseTimestamp(record.updated_at, "updated_at"),
  };
}

function assertLenderProductRecord(record: LenderProductRecord): void {
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.lender_id !== "string" ||
    typeof record.name !== "string" ||
    typeof record.active !== "boolean"
  ) {
    throw new AppError("data_error", "Invalid lender product record.", 500);
  }
}

function normalizeRequiredDocuments(value: unknown): RequiredDocument[] {
  if (Array.isArray(value)) {
    return value as RequiredDocument[];
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed as RequiredDocument[];
      }
    } catch {
      // fall through to error
    }
  }
  return [];
}

function parseTimestamp(value: unknown, fieldName: string): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed;
    }
  }
  throw new AppError(
    "data_error",
    `Invalid lender product ${fieldName}.`,
    500
  );
}

function parseRequiredDocuments(
  value: unknown,
  options?: { allowUndefined?: boolean }
): RequiredDocument[] {
  if (value === undefined) {
    if (options?.allowUndefined) {
      return [];
    }
    throw new AppError(
      "validation_error",
      "required_documents is required.",
      400
    );
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

    const { category, required, description } = item as {
      category?: unknown;
      required?: unknown;
      description?: unknown;
    };

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

    return {
      category: category.trim(),
      required,
      ...(typeof description === "string" && description.trim().length > 0
        ? { description: description.trim() }
        : {}),
    };
  });
}

/**
 * GET /api/lender-products
 * Query:
 * - active=true|false (optional)
 */
export async function listLenderProductsHandler(
  req: Request,
  res: Response
): Promise<void> {
  const activeOnly = req.query.active === "true";

  const products = await listLenderProductsService({ activeOnly });

  if (!Array.isArray(products)) {
    res.status(200).json([]);
    return;
  }

  res.status(200).json(products.map(toLenderProductResponse));
}

/**
 * POST /api/lender-products
 */
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

  if (
    name !== undefined &&
    name !== null &&
    typeof name !== "string"
  ) {
    throw new AppError("validation_error", "name must be a string.", 400);
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    throw new AppError(
      "validation_error",
      "description must be a string.",
      400
    );
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

  const created = await createLenderProductService({
    lenderId: lenderId.trim(),
    name,
    description: typeof description === "string" ? description.trim() : null,
    active: typeof active === "boolean" ? active : true,
    requiredDocuments: requiredDocumentsList,
  });

  res.status(201).json(toLenderProductResponse(created));
}

/**
 * PUT /api/lender-products/:id
 */
export async function updateLenderProductHandler(
  req: Request,
  res: Response
): Promise<void> {
  const { id } = req.params;

  if (typeof id !== "string" || id.trim().length === 0) {
    throw new AppError("validation_error", "id is required.", 400);
  }

  const { name, required_documents, requiredDocuments } = req.body ?? {};

  if (
    name !== undefined &&
    name !== null &&
    typeof name !== "string"
  ) {
    throw new AppError("validation_error", "name must be a string.", 400);
  }

  const requiredDocumentsList = parseRequiredDocuments(
    required_documents ?? requiredDocuments
  );

  const updated = await updateLenderProductService({
    id: id.trim(),
    name,
    requiredDocuments: requiredDocumentsList,
  });

  if (!updated) {
    throw new AppError("not_found", "Lender product not found.", 404);
  }

  res.status(200).json(toLenderProductResponse(updated));
}

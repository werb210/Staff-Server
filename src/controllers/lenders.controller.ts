import { Request, Response } from "express";
import * as repo from "../repositories/lenders.repo";
import {
  getLenderByIdService,
  listLendersService,
} from "../services/lendersService";
import {
  listLenderProductsByLenderIdService,
} from "../services/lenderProductsService";
import { AppError } from "../middleware/errors";
import { type RequiredDocument } from "../db/schema/lenderProducts";
import { logError } from "../observability/logger";

type LenderProductResponse = {
  id: string;
  lenderId: string;
  name: string;
  description: string | null;
  active: boolean;
  required_documents: RequiredDocument[];
  createdAt: Date;
  updatedAt: Date;
};

const DEFAULT_SILO = "default";

function resolveSilo(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return DEFAULT_SILO;
}

function filterBySilo<T extends { silo?: string | null }>(
  records: T[],
  silo: string
): T[] {
  return records.filter((record) => resolveSilo(record?.silo) === silo);
}

export async function listLenders(
  req: Request,
  res: Response
): Promise<void> {
  const requestId = res.locals.requestId ?? "unknown";
  try {
    const safeLenders = await listLendersService();
    const resolvedSilo = resolveSilo(req.user?.silo);
    const filtered = filterBySilo(safeLenders, resolvedSilo);
    res.status(200).json(filtered);
  } catch (err) {
    logError("lenders_list_failed", {
      error: err,
      requestId,
      route: req.originalUrl,
      sql: repo.LIST_LENDERS_SQL,
      params: [],
      stack: err instanceof Error ? err.stack : undefined,
    });
    res.status(500).json({
      code: "internal_error",
      message: err instanceof Error ? err.message : "Unknown error",
      requestId,
    });
  }
}

function toLenderProductResponse(record: {
  id: string;
  lender_id: string;
  name: string;
  description: string | null;
  active: boolean;
  required_documents: RequiredDocument[];
  created_at: Date;
  updated_at: Date;
}): LenderProductResponse {
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.lender_id !== "string" ||
    typeof record.name !== "string" ||
    typeof record.active !== "boolean"
  ) {
    throw new AppError("data_error", "Invalid lender product record.", 500);
  }

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

export async function getLenderWithProducts(
  req: Request,
  res: Response
): Promise<void> {
  const requestId = res.locals.requestId ?? "unknown";
  try {
    const { id } = req.params;

    if (typeof id !== "string" || id.trim().length === 0) {
      throw new AppError("validation_error", "id is required.", 400);
    }

    const lender = await getLenderByIdService(id.trim());
    if (!lender) {
      throw new AppError("not_found", "Lender not found.", 404);
    }

    const products = await listLenderProductsByLenderIdService({
      lenderId: id.trim(),
      silo: req.user?.silo ?? null,
    });

    res.json({
      lender,
      products: products.map(toLenderProductResponse),
    });
  } catch (err) {
    logError("lender_with_products_failed", {
      error: err,
      requestId,
      route: req.originalUrl,
      stack: err instanceof Error ? err.stack : undefined,
    });
    if (err instanceof AppError) {
      res.status(err.status).json({
        code: err.code,
        message: err.message,
        requestId,
      });
      return;
    }
    res.status(500).json({
      code: "internal_error",
      message: err instanceof Error ? err.message : "Unknown error",
      requestId,
    });
  }
}

export async function createLender(
  req: Request,
  res: Response
): Promise<void> {
  const requestId = res.locals.requestId ?? "unknown";
  try {
    const {
      name,
      country,
      submissionMethod,
      email,
      phone,
      website,
      postal_code
    } = req.body ?? {};

    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "name_required" });
      return;
    }
    if (!country || typeof country !== "string") {
      res.status(400).json({ error: "country_required" });
      return;
    }

    const normalizedSubmissionMethod =
      typeof submissionMethod === "string"
        ? submissionMethod.toLowerCase()
        : null;

    const lender = await repo.createLender({
      name,
      country,
      submission_method: normalizedSubmissionMethod,
      email: email ?? null,
      phone: phone ?? null,
      website: website ?? null,
      postal_code: postal_code ?? null
    });

    res.status(201).json(lender);
  } catch (err) {
    logError("lender_create_failed", {
      error: err,
      requestId,
      route: req.originalUrl,
      stack: err instanceof Error ? err.stack : undefined,
    });
    if (err instanceof AppError) {
      res.status(err.status).json({
        code: err.code,
        message: err.message,
        requestId,
      });
      return;
    }
    res.status(500).json({
      code: "internal_error",
      message: err instanceof Error ? err.message : "Unknown error",
      requestId,
    });
  }
}

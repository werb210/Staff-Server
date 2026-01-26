import { Request, Response } from "express";
import { pool } from "../db";
import * as repo from "../repositories/lenders.repo";
import {
  getLenderByIdService,
  listLendersService,
} from "../services/lendersService";
import {
  listLenderProductsByLenderIdService,
} from "../services/lenderProductsService";
import { AppError } from "../middleware/errors";
import {
  type JsonObject,
  type RequiredDocuments,
} from "../db/schema/lenderProducts";
import { logError } from "../observability/logger";
import { ROLES } from "../auth/roles";
import { LENDER_SUBMISSION_METHODS } from "../db/schema/lenders";

type LenderProductResponse = {
  id: string;
  lenderId: string;
  name: string;
  description: string | null;
  active: boolean;
  required_documents: RequiredDocuments;
  eligibility: JsonObject | null;
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
  return records.filter((record) => resolveSilo(record.silo) === silo);
}

export async function listLenders(
  req: Request,
  res: Response
): Promise<void> {
  const requestId = res.locals.requestId ?? "unknown";
  try {
    const safeLenders = await listLendersService();
    const user = req.user;
    if (user?.role === ROLES.LENDER) {
      const lenderId = user.lenderId;
      const scoped = lenderId
        ? safeLenders.filter((lender) => lender.id === lenderId)
        : [];
      res.status(200).json(scoped);
      return;
    }
    if (user?.role === ROLES.ADMIN || user?.role === ROLES.OPS) {
      res.status(200).json(safeLenders);
      return;
    }
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
  required_documents: RequiredDocuments;
  eligibility: JsonObject | null;
  created_at: Date;
  updated_at: Date;
}): LenderProductResponse {
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.lender_id !== "string" ||
    typeof record.name !== "string" ||
    typeof record.active !== "boolean" ||
    !isRequiredDocuments(record.required_documents) ||
    !isEligibility(record.eligibility)
  ) {
    throw new AppError("data_error", "Invalid lender product record.", 500);
  }

  const normalizedDocuments = requireRecordDocuments(record.required_documents);

  return {
    id: record.id,
    lenderId: record.lender_id,
    name: record.name,
    description: record.description,
    active: record.active,
    required_documents: normalizedDocuments,
    eligibility: isPlainObject(record.eligibility) ? record.eligibility : null,
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

function requireRecordDocuments(value: unknown): RequiredDocuments {
  if (isRequiredDocuments(value)) {
    return value;
  }
  throw new AppError("data_error", "Invalid required_documents.", 500);
}

function isPlainObject(value: unknown): value is JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isRequiredDocuments(value: unknown): value is RequiredDocuments {
  return Array.isArray(value) && value.every(isPlainObject);
}

function isEligibility(value: unknown): value is JsonObject | null {
  return value === null || isPlainObject(value);
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

    if (req.user?.role === ROLES.LENDER) {
      if (!req.user.lenderId) {
        throw new AppError(
          "invalid_lender_binding",
          "lender_id is required for Lender users.",
          400
        );
      }
      if (req.user.lenderId !== id.trim()) {
        throw new AppError("forbidden", "Access denied.", 403);
      }
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
      active,
      status,
      contact,
      email,
      submissionEmail,
      phone,
      website,
      postal_code
    } = req.body ?? {};

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new AppError("validation_error", "name is required.", 400);
    }
    if (!country || typeof country !== "string" || country.trim().length === 0) {
      throw new AppError("validation_error", "country is required.", 400);
    }
    if (active !== undefined && typeof active !== "boolean") {
      throw new AppError("validation_error", "active must be a boolean.", 400);
    }
    if (status !== undefined && status !== null && typeof status !== "string") {
      throw new AppError("validation_error", "status must be a string.", 400);
    }
    if (contact !== undefined && contact !== null && typeof contact !== "object") {
      throw new AppError("validation_error", "contact must be an object.", 400);
    }
    if (
      submissionEmail !== undefined &&
      submissionEmail !== null &&
      typeof submissionEmail !== "string"
    ) {
      throw new AppError("validation_error", "submissionEmail must be a string.", 400);
    }

    const contactName =
      contact && typeof (contact as { name?: unknown }).name === "string"
        ? (contact as { name: string }).name.trim()
        : null;
    const contactEmail =
      contact && typeof (contact as { email?: unknown }).email === "string"
        ? (contact as { email: string }).email.trim()
        : null;

    let resolvedStatus =
      typeof status === "string" && status.trim().length > 0
        ? status.trim()
        : undefined;
    if (active === true) {
      resolvedStatus = "ACTIVE";
    } else if (active === false && resolvedStatus === undefined) {
      resolvedStatus = "INACTIVE";
    }
    if (!resolvedStatus) {
      resolvedStatus = "ACTIVE";
    }

    const normalizedSubmissionMethod =
      typeof submissionMethod === "string"
        ? submissionMethod.trim().toUpperCase()
        : null;
    if (
      normalizedSubmissionMethod &&
      !LENDER_SUBMISSION_METHODS.includes(normalizedSubmissionMethod as any)
    ) {
      throw new AppError(
        "validation_error",
        "submissionMethod is invalid.",
        400
      );
    }

    const lender = await repo.createLender(pool, {
      name: name.trim(),
      country: country.trim(),
      submission_method: normalizedSubmissionMethod,
      active: typeof active === "boolean" ? active : undefined,
      status: resolvedStatus,
      primary_contact_name: contactName,
      email: contactEmail ?? email ?? null,
      submission_email: submissionEmail ?? null,
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

export async function updateLender(
  req: Request,
  res: Response
): Promise<void> {
  const requestId = res.locals.requestId ?? "unknown";
  try {
    const { id } = req.params;
    if (typeof id !== "string" || id.trim().length === 0) {
      throw new AppError("validation_error", "id is required.", 400);
    }

    const {
      name,
      status,
      country,
      active,
      contact,
      email,
      submissionEmail,
    } = req.body ?? {};

    if (name !== undefined && name !== null && typeof name !== "string") {
      throw new AppError("validation_error", "name must be a string.", 400);
    }
    if (status !== undefined && status !== null && typeof status !== "string") {
      throw new AppError("validation_error", "status must be a string.", 400);
    }
    if (
      country !== undefined &&
      country !== null &&
      typeof country !== "string"
    ) {
      throw new AppError("validation_error", "country must be a string.", 400);
    }
    if (active !== undefined && typeof active !== "boolean") {
      throw new AppError("validation_error", "active must be a boolean.", 400);
    }
    if (contact !== undefined && contact !== null && typeof contact !== "object") {
      throw new AppError("validation_error", "contact must be an object.", 400);
    }
    if (
      submissionEmail !== undefined &&
      submissionEmail !== null &&
      typeof submissionEmail !== "string"
    ) {
      throw new AppError("validation_error", "submissionEmail must be a string.", 400);
    }

    const contactName =
      contact && typeof (contact as { name?: unknown }).name === "string"
        ? (contact as { name: string }).name.trim()
        : undefined;
    const contactEmail =
      contact && typeof (contact as { email?: unknown }).email === "string"
        ? (contact as { email: string }).email.trim()
        : undefined;

    let resolvedStatus =
      typeof status === "string" && status.trim().length > 0
        ? status.trim()
        : undefined;
    if (active === true) {
      resolvedStatus = "ACTIVE";
    } else if (active === false && resolvedStatus === undefined) {
      resolvedStatus = "INACTIVE";
    }

    const updated = await repo.updateLender(pool, {
      id: id.trim(),
      name: typeof name === "string" ? name.trim() : undefined,
      status: resolvedStatus,
      country: typeof country === "string" ? country.trim() : undefined,
      primary_contact_name: contactName,
      email: contactEmail ?? (typeof email === "string" ? email.trim() : undefined),
      submission_email:
        typeof submissionEmail === "string" ? submissionEmail.trim() : undefined,
      active: typeof active === "boolean" ? active : undefined,
    });

    if (!updated) {
      throw new AppError("not_found", "Lender not found.", 404);
    }

    res.status(200).json(updated);
  } catch (err) {
    logError("lender_update_failed", {
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

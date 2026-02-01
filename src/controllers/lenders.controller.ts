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
import { LENDER_COUNTRIES, LENDER_SUBMISSION_METHODS } from "../db/schema/lenders";

type LenderProductResponse = {
  id: string;
  lenderId: string;
  name: string;
  active: boolean;
  category: string;
  country: string;
  rate_type: string | null;
  interest_min: string | null;
  interest_max: string | null;
  term_min: number | null;
  term_max: number | null;
  term_unit: string;
  required_documents: RequiredDocuments;
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

export async function getLenderByIdHandler(
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

    const statusValue =
      typeof (lender as { status?: unknown }).status === "string"
        ? (lender as { status?: string }).status
        : typeof (lender as { active?: unknown }).active === "boolean"
          ? (lender as { active: boolean }).active
            ? "ACTIVE"
            : "INACTIVE"
          : "ACTIVE";

    const contactName =
      (lender as { primary_contact_name?: string | null }).primary_contact_name ??
      (lender as { contact_name?: string | null }).contact_name ??
      null;
    const contactEmail =
      (lender as { primary_contact_email?: string | null }).primary_contact_email ??
      (lender as { contact_email?: string | null }).contact_email ??
      null;
    const contactPhone =
      (lender as { primary_contact_phone?: string | null }).primary_contact_phone ??
      (lender as { contact_phone?: string | null }).contact_phone ??
      null;

    res.status(200).json({
      id: lender.id,
      name: lender.name,
      status: statusValue,
      active:
        typeof (lender as { active?: unknown }).active === "boolean"
          ? (lender as { active: boolean }).active
          : statusValue === "ACTIVE",
      country: (lender as { country?: string | null }).country ?? null,
      email: (lender as { email?: string | null }).email ?? null,
      primary_contact_name: contactName,
      primary_contact_email: contactEmail,
      primary_contact_phone: contactPhone,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      website: (lender as { website?: string | null }).website ?? null,
      submission_method:
        (lender as { submission_method?: string | null }).submission_method ??
        null,
      submission_email:
        (lender as { submission_email?: string | null }).submission_email ?? null,
      api_config:
        (lender as { api_config?: JsonObject | null }).api_config ?? null,
      created_at: (lender as { created_at?: Date }).created_at ?? null,
      updated_at: (lender as { updated_at?: Date }).updated_at ?? null,
    });
  } catch (err) {
    logError("lender_get_failed", {
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

function toLenderProductResponse(record: {
  id: string;
  lender_id: string;
  name: string;
  active: boolean;
  category?: string | null;
  country?: string | null;
  rate_type?: string | null;
  interest_min?: string | null;
  interest_max?: string | null;
  term_min?: number | null;
  term_max?: number | null;
  term_unit?: string | null;
  required_documents: RequiredDocuments;
  created_at: Date;
  updated_at: Date;
}): LenderProductResponse {
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.lender_id !== "string" ||
    typeof record.name !== "string" ||
    typeof record.active !== "boolean" ||
    !isRequiredDocuments(record.required_documents)
  ) {
    throw new AppError("data_error", "Invalid lender product record.", 500);
  }

  const normalizedDocuments = requireRecordDocuments(record.required_documents);

  return {
    id: record.id,
    lenderId: record.lender_id,
    name: record.name,
    active: record.active,
    category: record.category ?? "LOC",
    country: record.country ?? "BOTH",
    rate_type: record.rate_type ?? null,
    interest_min: record.interest_min ?? null,
    interest_max: record.interest_max ?? null,
    term_min: record.term_min ?? null,
    term_max: record.term_max ?? null,
    term_unit: record.term_unit ?? "MONTHS",
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
      apiConfig,
      active,
      contact,
      email,
      submissionEmail,
      website,
    } = req.body ?? {};

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new AppError("validation_error", "name is required.", 400);
    }
    if (!country || typeof country !== "string" || country.trim().length === 0) {
      throw new AppError("validation_error", "country is required.", 400);
    }
    const normalizedCountry = country.trim().toUpperCase();
    if (!LENDER_COUNTRIES.includes(normalizedCountry as any)) {
      throw new AppError("validation_error", "country is invalid.", 400);
    }
    if (!submissionMethod || typeof submissionMethod !== "string") {
      throw new AppError(
        "validation_error",
        "submissionMethod is required.",
        400
      );
    }
    if (active !== undefined && typeof active !== "boolean") {
      throw new AppError("validation_error", "active must be a boolean.", 400);
    }
    if (contact !== undefined && contact !== null && typeof contact !== "object") {
      throw new AppError("validation_error", "contact must be an object.", 400);
    }
    if (email !== undefined && email !== null && typeof email !== "string") {
      throw new AppError("validation_error", "email must be a string.", 400);
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
    const contactPhone =
      contact && typeof (contact as { phone?: unknown }).phone === "string"
        ? (contact as { phone: string }).phone.trim()
        : null;

    const resolvedStatus =
      typeof active === "boolean"
        ? active
          ? "ACTIVE"
          : "INACTIVE"
        : "ACTIVE";

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
    if (normalizedSubmissionMethod === "EMAIL") {
      const normalizedSubmissionEmail =
        typeof submissionEmail === "string" ? submissionEmail.trim() : "";
      if (!normalizedSubmissionEmail) {
        throw new AppError(
          "validation_error",
          "submissionEmail is required for EMAIL submissions.",
          400
        );
      }
    }
    if (normalizedSubmissionMethod === "API") {
      if (apiConfig === undefined || apiConfig === null || typeof apiConfig !== "object") {
        throw new AppError(
          "validation_error",
          "apiConfig is required for API submissions.",
          400
        );
      }
    }

    const normalizedSubmissionEmail =
      typeof submissionEmail === "string" ? submissionEmail.trim() : null;

    const lender = await repo.createLender(pool, {
      name: name.trim(),
      country: normalizedCountry,
      submission_method: normalizedSubmissionMethod ?? "EMAIL",
      active: typeof active === "boolean" ? active : undefined,
      status: resolvedStatus,
      email: typeof email === "string" ? email.trim() : null,
      primary_contact_name: contactName,
      primary_contact_email: contactEmail ?? null,
      primary_contact_phone: contactPhone ?? null,
      submission_email: normalizedSubmissionEmail,
      website: typeof website === "string" ? website.trim() : null,
      api_config:
        apiConfig && typeof apiConfig === "object" ? (apiConfig as JsonObject) : null,
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
      submissionMethod,
      apiConfig,
      website,
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
    const normalizedCountry =
      typeof country === "string" && country.trim().length > 0
        ? country.trim().toUpperCase()
        : undefined;
    if (
      normalizedCountry &&
      !LENDER_COUNTRIES.includes(normalizedCountry as any)
    ) {
      throw new AppError("validation_error", "country is invalid.", 400);
    }
    if (active !== undefined && typeof active !== "boolean") {
      throw new AppError("validation_error", "active must be a boolean.", 400);
    }
    if (contact !== undefined && contact !== null && typeof contact !== "object") {
      throw new AppError("validation_error", "contact must be an object.", 400);
    }
    if (email !== undefined && email !== null && typeof email !== "string") {
      throw new AppError("validation_error", "email must be a string.", 400);
    }
    if (
      submissionEmail !== undefined &&
      submissionEmail !== null &&
      typeof submissionEmail !== "string"
    ) {
      throw new AppError("validation_error", "submissionEmail must be a string.", 400);
    }
    if (
      submissionMethod !== undefined &&
      submissionMethod !== null &&
      typeof submissionMethod !== "string"
    ) {
      throw new AppError("validation_error", "submissionMethod must be a string.", 400);
    }
    const normalizedSubmissionMethod =
      typeof submissionMethod === "string"
        ? submissionMethod.trim().toUpperCase()
        : undefined;
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
    if (normalizedSubmissionMethod === "EMAIL") {
      const normalizedSubmissionEmail =
        typeof submissionEmail === "string" ? submissionEmail.trim() : "";
      if (!normalizedSubmissionEmail) {
        throw new AppError(
          "validation_error",
          "submissionEmail is required for EMAIL submissions.",
          400
        );
      }
    }
    if (normalizedSubmissionMethod === "API") {
      if (apiConfig === undefined || apiConfig === null || typeof apiConfig !== "object") {
        throw new AppError(
          "validation_error",
          "apiConfig is required for API submissions.",
          400
        );
      }
    }

    const contactName =
      contact && typeof (contact as { name?: unknown }).name === "string"
        ? (contact as { name: string }).name.trim()
        : undefined;
    const contactEmail =
      contact && typeof (contact as { email?: unknown }).email === "string"
        ? (contact as { email: string }).email.trim()
        : undefined;
    const contactPhone =
      contact && typeof (contact as { phone?: unknown }).phone === "string"
        ? (contact as { phone: string }).phone.trim()
        : undefined;

    let resolvedStatus =
      typeof status === "string" && status.trim().length > 0
        ? status.trim().toUpperCase()
        : undefined;
    if (active === true || active === false) {
      resolvedStatus = active ? "ACTIVE" : "INACTIVE";
    }
    if (
      resolvedStatus &&
      resolvedStatus !== "ACTIVE" &&
      resolvedStatus !== "INACTIVE"
    ) {
      throw new AppError("validation_error", "status is invalid.", 400);
    }
    const resolvedActive =
      typeof active === "boolean"
        ? active
        : resolvedStatus
          ? resolvedStatus === "ACTIVE"
          : undefined;

    const updated = await repo.updateLender(pool, {
      id: id.trim(),
      name: typeof name === "string" ? name.trim() : undefined,
      status: resolvedStatus,
      country: normalizedCountry,
      email: typeof email === "string" ? email.trim() : undefined,
      primary_contact_name: contactName,
      primary_contact_email: contactEmail,
      primary_contact_phone: contactPhone,
      submission_email:
        typeof submissionEmail === "string" ? submissionEmail.trim() : undefined,
      submission_method: normalizedSubmissionMethod,
      website: typeof website === "string" ? website.trim() : undefined,
      active: resolvedActive,
      api_config:
        apiConfig && typeof apiConfig === "object" ? (apiConfig as JsonObject) : undefined,
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

import { type Request, type Response } from "express";
import { AppError } from "../middleware/errors";
import {
  createLenderProductService,
  getLenderProductByIdService,
  listLenderProductsByLenderIdService,
  updateLenderProductService,
} from "../services/lenderProductsService";
import {
  type JsonObject,
  type LenderProductRecord,
  type RequiredDocuments,
} from "../db/schema/lenderProducts";
import { getLenderById } from "../repositories/lenders.repo";
import { logError } from "../observability/logger";
import { LIST_LENDER_PRODUCTS_SQL } from "../repositories/lenderProducts.repo";
import { ROLES } from "../auth/roles";
import { LENDER_COUNTRIES } from "../db/schema/lenders";

export type LenderProductResponse = {
  id: string;
  lenderId: string;
  lenderName: string | null;
  name: string;
  description: string | null;
  active: boolean;
  type: string | null;
  min_amount: number | null;
  max_amount: number | null;
  status: string | null;
  country: string | null;
  rate_type: string | null;
  min_rate: string | null;
  max_rate: string | null;
  required_documents: RequiredDocuments;
  eligibility: JsonObject | null;
  createdAt: Date;
  updatedAt: Date;
};

function toLenderProductResponse(
  record: LenderProductRecord
): LenderProductResponse {
  assertLenderProductRecord(record);
  const normalizedDocuments = requireRecordDocuments(record.required_documents);

  return {
    id: record.id,
    lenderId: record.lender_id,
    lenderName: record.lender_name ?? null,
    name: record.name,
    description: record.description,
    active: record.active,
    type: record.type ?? null,
    min_amount: record.min_amount ?? null,
    max_amount: record.max_amount ?? null,
    status: record.status ?? null,
    country: record.country ?? null,
    rate_type: record.rate_type ?? null,
    min_rate: record.min_rate ?? null,
    max_rate: record.max_rate ?? null,
    required_documents: normalizedDocuments,
    eligibility: isPlainObject(record.eligibility) ? record.eligibility : null,
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
    typeof record.active !== "boolean" ||
    !isRequiredDocuments(record.required_documents) ||
    !isEligibility(record.eligibility)
  ) {
    throw new AppError("data_error", "Invalid lender product record.", 500);
  }
}

function requireRecordDocuments(value: unknown): RequiredDocuments {
  if (isRequiredDocuments(value)) {
    return value;
  }
  throw new AppError("data_error", "Invalid required_documents.", 500);
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

function parseRequiredDocuments(value: unknown): RequiredDocuments {
  if (value === undefined) {
    return [];
  }

  if (value === null) {
    throw new AppError(
      "validation_error",
      "required_documents cannot be null.",
      400
    );
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (isRequiredDocuments(parsed)) {
        return parsed;
      }
    } catch {
      // fall through to validation error
    }
  }

  if (isRequiredDocuments(value)) {
    return value;
  }

  throw new AppError(
    "validation_error",
    "required_documents must be an array of objects.",
    400
  );
}

function ensureBankStatementDocuments(documents: RequiredDocuments): RequiredDocuments {
  const normalized = documents.map((doc) => ({ ...doc })) as RequiredDocuments;
  const bankIndex = normalized.findIndex((doc) => doc.type === "bank_statement");
  if (bankIndex >= 0) {
    const existing = normalized[bankIndex] as JsonObject;
    if (existing.months !== 6) {
      normalized[bankIndex] = { ...existing, months: 6 };
    }
    return normalized;
  }
  return [...normalized, { type: "bank_statement", months: 6 }];
}

function parseEligibility(value: unknown): JsonObject | null {
  if (value === undefined) {
    return null;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (isPlainObject(parsed)) {
        return parsed;
      }
    } catch {
      // fall through
    }
  }
  if (isPlainObject(value)) {
    return value;
  }
  throw new AppError(
    "validation_error",
    "eligibility must be a JSON object.",
    400
  );
}

function parseRateValue(value: unknown, fieldName: string): number | string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  throw new AppError("validation_error", `${fieldName} must be a number or string.`, 400);
}

function normalizeVariableRate(): string {
  return "P+";
}

function parseAmount(value: unknown, fieldName: string): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  throw new AppError("validation_error", `${fieldName} must be a number.`, 400);
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

/**
 * GET /api/lender-products
 * Query:
 * - active=true|false (optional)
 */
export async function listLenderProductsHandler(
  req: Request,
  res: Response
): Promise<void> {
  const requestId = res.locals.requestId ?? "unknown";

  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        code: "missing_token",
        message: "Authorization token is required.",
        requestId,
      });
      return;
    }

    if (user.role === ROLES.REFERRER) {
      res.status(403).json({
        code: "forbidden",
        message: "Access denied.",
        requestId,
      });
      return;
    }

    if (user.role === ROLES.LENDER && !user.lenderId) {
      throw new AppError(
        "invalid_lender_binding",
        "lender_id is required for Lender users.",
        400
      );
    }

    const queryLenderId =
      typeof req.query.lenderId === "string"
        ? req.query.lenderId.trim()
        : "";
    const resolvedLenderId =
      user.role === ROLES.LENDER
        ? user.lenderId ?? ""
        : queryLenderId;
    if (!resolvedLenderId) {
      throw new AppError("validation_error", "lenderId is required.", 400);
    }

    const lender = await getLenderById(resolvedLenderId.trim());
    if (!lender) {
      throw new AppError("not_found", "Lender not found.", 404);
    }
    const lenderStatus =
      typeof (lender as { status?: unknown }).status === "string"
        ? (lender as { status?: string }).status
        : null;
    const lenderActive =
      typeof (lender as { active?: unknown }).active === "boolean"
        ? (lender as { active: boolean }).active
        : lenderStatus === "ACTIVE";
    if (!lenderActive) {
      res.status(200).json([]);
      return;
    }

    const queryCountry =
      typeof req.query.country === "string"
        ? req.query.country.trim().toUpperCase()
        : "";
    if (queryCountry && !LENDER_COUNTRIES.includes(queryCountry as any)) {
      throw new AppError("validation_error", "country is invalid.", 400);
    }

    const products = await listLenderProductsByLenderIdService({
      lenderId: resolvedLenderId,
      silo: user.silo ?? null,
    });
    if (!Array.isArray(products)) {
      throw new AppError(
        "data_error",
        "Invalid lender products response.",
        500
      );
    }
    const filteredProducts = queryCountry
      ? products.filter((product) => {
          const productCountry =
            typeof product.country === "string" ? product.country.toUpperCase() : "BOTH";
          return productCountry === "BOTH" || productCountry === queryCountry;
        })
      : products;
    res.status(200).json(filteredProducts.map(toLenderProductResponse));
  } catch (err) {
    logError("lender_products_list_failed", {
      error: err,
      requestId,
      route: req.originalUrl,
      sql: LIST_LENDER_PRODUCTS_SQL,
      params: [],
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

/**
 * POST /api/lender-products
 */
export async function createLenderProductHandler(
  req: Request,
  res: Response
): Promise<void> {
  const requestId = res.locals.requestId ?? "unknown";
  try {
    const user = req.user;
    if (!user) {
      throw new AppError(
        "missing_token",
        "Authorization token is required.",
        401
      );
    }

    if (user.role === ROLES.REFERRER) {
      throw new AppError("forbidden", "Access denied.", 403);
    }

    const {
      lenderId,
      name,
      description,
      active,
      required_documents,
      eligibility,
      type,
      min_amount,
      max_amount,
      status,
      country,
      rate_type,
      min_rate,
      max_rate,
    } =
      req.body ?? {};

    if (user.role === ROLES.LENDER) {
      if (!user.lenderId) {
        throw new AppError(
          "invalid_lender_binding",
          "lender_id is required for Lender users.",
          400
        );
      }
      if (lenderId !== undefined && lenderId !== null && typeof lenderId !== "string") {
        throw new AppError("validation_error", "lenderId must be a string.", 400);
      }
      if (
        typeof lenderId === "string" &&
        lenderId.trim().length > 0 &&
        lenderId.trim() !== user.lenderId
      ) {
        throw new AppError("forbidden", "Access denied.", 403);
      }
    }

    const resolvedLenderId =
      user.role === ROLES.LENDER
        ? user.lenderId
        : typeof lenderId === "string"
          ? lenderId.trim()
          : "";

    if (!resolvedLenderId || resolvedLenderId.length === 0) {
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

    if (type !== undefined && type !== null && typeof type !== "string") {
      throw new AppError("validation_error", "type must be a string.", 400);
    }

    if (status !== undefined && status !== null && typeof status !== "string") {
      throw new AppError("validation_error", "status must be a string.", 400);
    }
    if (country !== undefined && country !== null && typeof country !== "string") {
      throw new AppError("validation_error", "country must be a string.", 400);
    }
    const normalizedCountry =
      typeof country === "string" && country.trim().length > 0
        ? country.trim().toUpperCase()
        : null;
    if (
      normalizedCountry &&
      !LENDER_COUNTRIES.includes(normalizedCountry as any)
    ) {
      throw new AppError("validation_error", "country is invalid.", 400);
    }
    if (rate_type !== undefined && rate_type !== null && typeof rate_type !== "string") {
      throw new AppError("validation_error", "rate_type must be a string.", 400);
    }
    const normalizedRateType =
      typeof rate_type === "string" && rate_type.trim().length > 0
        ? rate_type.trim().toUpperCase()
        : null;
    if (normalizedRateType && normalizedRateType !== "VARIABLE" && normalizedRateType !== "FIXED") {
      throw new AppError("validation_error", "rate_type is invalid.", 400);
    }

    const requiredDocumentsList = ensureBankStatementDocuments(
      parseRequiredDocuments(required_documents)
    );
    const eligibilityData = parseEligibility(eligibility);
    const minAmount = parseAmount(min_amount, "min_amount");
    const maxAmount = parseAmount(max_amount, "max_amount");
    const parsedMinRate =
      normalizedRateType === "VARIABLE"
        ? normalizeVariableRate()
        : parseRateValue(min_rate, "min_rate");
    const parsedMaxRate =
      normalizedRateType === "VARIABLE"
        ? normalizeVariableRate()
        : parseRateValue(max_rate, "max_rate");

    const lender = await getLenderById(resolvedLenderId.trim());
    if (!lender) {
      throw new AppError("not_found", "Lender not found.", 404);
    }
    const lenderStatus =
      typeof (lender as { status?: unknown }).status === "string"
        ? (lender as { status?: string }).status
        : null;
    const lenderActive =
      typeof (lender as { active?: unknown }).active === "boolean"
        ? (lender as { active: boolean }).active
        : lenderStatus === "ACTIVE";
    if (!lenderActive) {
      throw new AppError(
        "lender_inactive",
        "Lender must be active to add products",
        409
      );
    }

    const created = await createLenderProductService({
      lenderId: resolvedLenderId.trim(),
      lenderName: lender.name,
      name,
      description: typeof description === "string" ? description.trim() : null,
      active: typeof active === "boolean" ? active : true,
      type,
      minAmount,
      maxAmount,
      status,
      requiredDocuments: requiredDocumentsList,
      eligibility: eligibilityData,
      country: normalizedCountry ?? "BOTH",
      rateType: normalizedRateType,
      minRate: parsedMinRate,
      maxRate: parsedMaxRate,
    });

    res.status(201).json(toLenderProductResponse(created));
  } catch (err) {
    logError("lender_products_create_failed", {
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

/**
 * PUT /api/lender-products/:id
 */
export async function updateLenderProductHandler(
  req: Request,
  res: Response
): Promise<void> {
  const requestId = res.locals.requestId ?? "unknown";
  try {
    const user = req.user;
    if (!user) {
      throw new AppError(
        "missing_token",
        "Authorization token is required.",
        401
      );
    }

    if (user.role === ROLES.REFERRER) {
      throw new AppError("forbidden", "Access denied.", 403);
    }

    const { id } = req.params;

    if (typeof id !== "string" || id.trim().length === 0) {
      throw new AppError("validation_error", "id is required.", 400);
    }

    const {
      name,
      description,
      active,
      required_documents,
      eligibility,
      type,
      min_amount,
      max_amount,
      status,
      country,
      rate_type,
      min_rate,
      max_rate,
    } = req.body ?? {};

    if (
      name !== undefined &&
      name !== null &&
      typeof name !== "string"
    ) {
      throw new AppError("validation_error", "name must be a string.", 400);
    }

    if (description !== undefined && description !== null && typeof description !== "string") {
      throw new AppError("validation_error", "description must be a string.", 400);
    }

    if (active !== undefined && typeof active !== "boolean") {
      throw new AppError("validation_error", "active must be a boolean.", 400);
    }

    if (type !== undefined && type !== null && typeof type !== "string") {
      throw new AppError("validation_error", "type must be a string.", 400);
    }

    if (status !== undefined && status !== null && typeof status !== "string") {
      throw new AppError("validation_error", "status must be a string.", 400);
    }

    if (country !== undefined && country !== null && typeof country !== "string") {
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

    if (rate_type !== undefined && rate_type !== null && typeof rate_type !== "string") {
      throw new AppError("validation_error", "rate_type must be a string.", 400);
    }
    const normalizedRateType =
      typeof rate_type === "string" && rate_type.trim().length > 0
        ? rate_type.trim().toUpperCase()
        : undefined;
    if (normalizedRateType && normalizedRateType !== "VARIABLE" && normalizedRateType !== "FIXED") {
      throw new AppError("validation_error", "rate_type is invalid.", 400);
    }

    const requiredDocumentsList = ensureBankStatementDocuments(
      parseRequiredDocuments(required_documents)
    );
    const eligibilityData =
      eligibility !== undefined ? parseEligibility(eligibility) : undefined;
    const minAmount = min_amount !== undefined ? parseAmount(min_amount, "min_amount") : undefined;
    const maxAmount = max_amount !== undefined ? parseAmount(max_amount, "max_amount") : undefined;
    const parsedMinRate =
      normalizedRateType === "VARIABLE"
        ? normalizeVariableRate()
        : min_rate !== undefined
          ? parseRateValue(min_rate, "min_rate")
          : undefined;
    const parsedMaxRate =
      normalizedRateType === "VARIABLE"
        ? normalizeVariableRate()
        : max_rate !== undefined
          ? parseRateValue(max_rate, "max_rate")
          : undefined;

    if (user.role === ROLES.LENDER) {
      if (!user.lenderId) {
        throw new AppError(
          "invalid_lender_binding",
          "lender_id is required for Lender users.",
          400
        );
      }
      const existing = await getLenderProductByIdService({ id: id.trim() });
      if (!existing) {
        throw new AppError("not_found", "Lender product not found.", 404);
      }
      if (existing.lender_id !== user.lenderId) {
        throw new AppError("forbidden", "Access denied.", 403);
      }
    }

    const updated = await updateLenderProductService({
      id: id.trim(),
      name,
      requiredDocuments: requiredDocumentsList,
      eligibility: eligibilityData,
      description: typeof description === "string" ? description.trim() : undefined,
      active,
      type: typeof type === "string" ? type.trim() : undefined,
      minAmount,
      maxAmount,
      status: typeof status === "string" ? status.trim() : undefined,
      country: normalizedCountry,
      rateType: normalizedRateType,
      minRate: parsedMinRate,
      maxRate: parsedMaxRate,
    });

    if (!updated) {
      throw new AppError("not_found", "Lender product not found.", 404);
    }

    res.status(200).json(toLenderProductResponse(updated));
  } catch (err) {
    logError("lender_products_update_failed", {
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

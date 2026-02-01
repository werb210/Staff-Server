import { type Request, type Response } from "express";
import { AppError } from "../middleware/errors";
import {
  createLenderProductService,
  getLenderProductByIdService,
  listLenderProductsService,
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
import { LENDER_PRODUCT_CATEGORIES } from "../db/schema/lenderProducts";

export type LenderProductResponse = {
  id: string;
  lenderId: string;
  name: string;
  category: string;
  active: boolean;
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

function toLenderProductResponse(
  record: LenderProductRecord
): LenderProductResponse {
  assertLenderProductRecord(record);
  const normalizedDocuments = requireRecordDocuments(record.required_documents);

  return {
    id: record.id,
    lenderId: record.lender_id,
    name: record.name,
    category: record.category ?? "LOC",
    active: record.active,
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

function assertLenderProductRecord(record: LenderProductRecord): void {
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

function normalizeCategoryValue(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (normalized === "STANDARD" || normalized === "LINE_OF_CREDIT") {
    return "LOC";
  }
  if (normalized === "TERM_LOAN") {
    return "TERM";
  }
  if (normalized === "PURCHASE_ORDER") {
    return "PO";
  }
  if (normalized === "EQUIPMENT_FINANCING") {
    return "EQUIPMENT";
  }
  if (normalized === "MERCHANT_CASH_ADVANCE") {
    return "MCA";
  }
  return normalized;
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
    const shouldScopeByLender = resolvedLenderId.length > 0;
    if (user.role === ROLES.LENDER && !shouldScopeByLender) {
      throw new AppError("validation_error", "lenderId is required.", 400);
    }

    if (shouldScopeByLender) {
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
    }

    const queryCountry =
      typeof req.query.country === "string"
        ? req.query.country.trim().toUpperCase()
        : "";
    if (queryCountry && !LENDER_COUNTRIES.includes(queryCountry as any)) {
      throw new AppError("validation_error", "country is invalid.", 400);
    }

    const products = shouldScopeByLender
      ? await listLenderProductsByLenderIdService({
          lenderId: resolvedLenderId,
          silo: user.silo ?? null,
        })
      : await listLenderProductsService({ silo: user.silo ?? null });
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
      active,
      required_documents,
      category,
      type,
      country,
      rate_type,
      interest_min,
      interest_max,
      term_min,
      term_max,
    } = req.body ?? {};

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

    if (active !== undefined && typeof active !== "boolean") {
      throw new AppError("validation_error", "active must be a boolean.", 400);
    }

    if (category !== undefined && category !== null && typeof category !== "string") {
      throw new AppError("validation_error", "category must be a string.", 400);
    }
    if (type !== undefined && type !== null && typeof type !== "string") {
      throw new AppError("validation_error", "type must be a string.", 400);
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
    const normalizedCategory =
      typeof category === "string" && category.trim().length > 0
        ? category.trim().toUpperCase()
        : typeof type === "string" && type.trim().length > 0
          ? type.trim().toUpperCase()
          : "LOC";
    const resolvedCategory = normalizeCategoryValue(normalizedCategory);
    if (!LENDER_PRODUCT_CATEGORIES.includes(resolvedCategory as any)) {
      throw new AppError("validation_error", "category is invalid.", 400);
    }
    const termMin = parseAmount(term_min, "term_min");
    const termMax = parseAmount(term_max, "term_max");
    const parsedMinRate =
      normalizedRateType === "VARIABLE"
        ? normalizeVariableRate()
        : parseRateValue(interest_min, "interest_min");
    const parsedMaxRate =
      normalizedRateType === "VARIABLE"
        ? normalizeVariableRate()
        : parseRateValue(interest_max, "interest_max");

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
      name,
      active: typeof active === "boolean" ? active : true,
      category: resolvedCategory,
      requiredDocuments: requiredDocumentsList,
      country: normalizedCountry ?? "BOTH",
      rateType: normalizedRateType,
      interestMin: parsedMinRate,
      interestMax: parsedMaxRate,
      termMin,
      termMax,
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
      active,
      required_documents,
      category,
      type,
      country,
      rate_type,
      interest_min,
      interest_max,
      term_min,
      term_max,
    } = req.body ?? {};

    if (
      name !== undefined &&
      name !== null &&
      typeof name !== "string"
    ) {
      throw new AppError("validation_error", "name must be a string.", 400);
    }

    if (active !== undefined && typeof active !== "boolean") {
      throw new AppError("validation_error", "active must be a boolean.", 400);
    }

    if (category !== undefined && category !== null && typeof category !== "string") {
      throw new AppError("validation_error", "category must be a string.", 400);
    }
    if (type !== undefined && type !== null && typeof type !== "string") {
      throw new AppError("validation_error", "type must be a string.", 400);
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
    const normalizedCategory =
      typeof category === "string" && category.trim().length > 0
        ? category.trim().toUpperCase()
        : typeof type === "string" && type.trim().length > 0
          ? type.trim().toUpperCase()
          : undefined;
    const resolvedCategory = normalizedCategory
      ? normalizeCategoryValue(normalizedCategory)
      : undefined;
    if (resolvedCategory && !LENDER_PRODUCT_CATEGORIES.includes(resolvedCategory as any)) {
      throw new AppError("validation_error", "category is invalid.", 400);
    }
    const termMin = term_min !== undefined ? parseAmount(term_min, "term_min") : undefined;
    const termMax = term_max !== undefined ? parseAmount(term_max, "term_max") : undefined;
    const parsedMinRate =
      normalizedRateType === "VARIABLE"
        ? normalizeVariableRate()
        : interest_min !== undefined
          ? parseRateValue(interest_min, "interest_min")
          : undefined;
    const parsedMaxRate =
      normalizedRateType === "VARIABLE"
        ? normalizeVariableRate()
        : interest_max !== undefined
          ? parseRateValue(interest_max, "interest_max")
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
      active,
      category: resolvedCategory,
      country: normalizedCountry,
      rateType: normalizedRateType,
      interestMin: parsedMinRate,
      interestMax: parsedMaxRate,
      termMin,
      termMax,
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

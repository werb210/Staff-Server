import { AppError } from "../middleware/errors";
import {
  createLenderProduct,
  getLenderProductById,
  listLenderProducts,
  listLenderProductsByLenderId,
  updateLenderProduct,
} from "../repositories/lenderProducts.repo";
import { type JsonObject, type RequiredDocuments } from "../db/schema/lenderProducts";
import { ensureSeedRequirementsForProduct } from "./lenderProductRequirementsService";

export const DEFAULT_LENDER_PRODUCT_NAME = "Unnamed Product";
const DEFAULT_SILO = "default";

function normalizeLenderProductName(value: unknown): string {
  if (value === undefined || value === null) {
    return DEFAULT_LENDER_PRODUCT_NAME;
  }

  if (typeof value !== "string") {
    throw new AppError("validation_error", "name must be a string.", 400);
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? DEFAULT_LENDER_PRODUCT_NAME : trimmed;
}

function resolveSilo(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return DEFAULT_SILO;
}

function filterBySilo<T extends Record<string, unknown>>(
  records: T[],
  silo: string
): T[] {
  return records.filter((record) => {
    const recordSilo = record.silo;
    if (
      recordSilo === undefined ||
      recordSilo === null ||
      (typeof recordSilo === "string" && recordSilo.trim().length === 0)
    ) {
      return true;
    }
    return resolveSilo(recordSilo) === silo;
  });
}

export async function createLenderProductService(params: {
  lenderId: string;
  lenderName: string;
  name: unknown;
  description?: string | null;
  active: boolean;
  type?: unknown;
  minAmount?: number | null;
  maxAmount?: number | null;
  status?: unknown;
  requiredDocuments: RequiredDocuments;
  eligibility?: JsonObject | null;
  country?: string | null;
  rateType?: string | null;
  minRate?: number | string | null;
  maxRate?: number | string | null;
}): Promise<Awaited<ReturnType<typeof createLenderProduct>>> {
  const normalizedName = normalizeLenderProductName(params.name);
  const normalizedType =
    typeof params.type === "string" && params.type.trim().length > 0
      ? params.type.trim()
      : "loc";
  const normalizedStatus =
    typeof params.status === "string" && params.status.trim().length > 0
      ? params.status.trim()
      : params.active
        ? "active"
        : "inactive";

  const product = await createLenderProduct({
    lenderId: params.lenderId,
    lenderName: params.lenderName,
    name: normalizedName,
    description: params.description ?? null,
    active: params.active,
    type: normalizedType,
    minAmount: params.minAmount ?? null,
    maxAmount: params.maxAmount ?? null,
    status: normalizedStatus,
    requiredDocuments: params.requiredDocuments,
    eligibility: params.eligibility ?? null,
    country: params.country ?? null,
    rateType: params.rateType ?? null,
    minRate: params.minRate ?? null,
    maxRate: params.maxRate ?? null,
  });
  await ensureSeedRequirementsForProduct({
    lenderProductId: product.id,
    productType: normalizedType,
  });
  return product;
}

export async function listLenderProductsService(params?: {
  silo?: string | null;
}): Promise<Awaited<ReturnType<typeof listLenderProducts>>> {
  const products = await listLenderProducts();
  const resolvedSilo = resolveSilo(params?.silo);
  return filterBySilo(products, resolvedSilo);
}

export async function listLenderProductsByLenderIdService(params: {
  lenderId: string;
  silo?: string | null;
}): Promise<Awaited<ReturnType<typeof listLenderProductsByLenderId>>> {
  const products = await listLenderProductsByLenderId(params.lenderId);
  const resolvedSilo = resolveSilo(params.silo);
  return filterBySilo(products, resolvedSilo);
}

export async function getLenderProductByIdService(params: {
  id: string;
}): Promise<Awaited<ReturnType<typeof getLenderProductById>>> {
  return getLenderProductById(params.id);
}

export async function updateLenderProductService(params: {
  id: string;
  name: unknown;
  requiredDocuments: RequiredDocuments;
  eligibility?: JsonObject | null;
}): Promise<Awaited<ReturnType<typeof updateLenderProduct>>> {
  const normalizedName = normalizeLenderProductName(params.name);

  return updateLenderProduct({
    id: params.id,
    name: normalizedName,
    requiredDocuments: params.requiredDocuments,
    eligibility: params.eligibility,
  });
}

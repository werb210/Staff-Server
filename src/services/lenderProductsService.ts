import { AppError } from "../middleware/errors";
import {
  createLenderProduct,
  listLenderProducts,
  listLenderProductsByLenderId,
  updateLenderProduct,
} from "../repositories/lenderProducts.repo";
import { type RequiredDocument } from "../db/schema/lenderProducts";

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

function normalizeRequiredDocuments<T extends { required_documents?: RequiredDocument[] | null }>(
  record: T
): T & { required_documents: RequiredDocument[] } {
  return {
    ...record,
    required_documents: record.required_documents ?? [],
  };
}

export async function createLenderProductService(params: {
  lenderId: string;
  name: unknown;
  description?: string | null;
  active: boolean;
  requiredDocuments: RequiredDocument[];
}): Promise<Awaited<ReturnType<typeof createLenderProduct>>> {
  const normalizedName = normalizeLenderProductName(params.name);

  return createLenderProduct({
    lenderId: params.lenderId,
    name: normalizedName,
    description: params.description ?? null,
    active: params.active,
    requiredDocuments: params.requiredDocuments,
  });
}

export async function listLenderProductsService(params?: {
  activeOnly?: boolean;
  silo?: string | null;
}): Promise<Awaited<ReturnType<typeof listLenderProducts>>> {
  const products = await listLenderProducts(params);
  const resolvedSilo = resolveSilo(params?.silo);
  const normalized = (products ?? []).map((product) =>
    normalizeRequiredDocuments(product)
  );
  return filterBySilo(normalized, resolvedSilo);
}

export async function listLenderProductsByLenderIdService(params: {
  lenderId: string;
  silo?: string | null;
}): Promise<Awaited<ReturnType<typeof listLenderProductsByLenderId>>> {
  const products = await listLenderProductsByLenderId(params);
  const resolvedSilo = resolveSilo(params.silo);
  const normalized = (products ?? []).map((product) =>
    normalizeRequiredDocuments(product)
  );
  return filterBySilo(normalized, resolvedSilo);
}

export async function updateLenderProductService(params: {
  id: string;
  name: unknown;
  requiredDocuments: RequiredDocument[];
}): Promise<Awaited<ReturnType<typeof updateLenderProduct>>> {
  const normalizedName = normalizeLenderProductName(params.name);

  return updateLenderProduct({
    id: params.id,
    name: normalizedName,
    requiredDocuments: params.requiredDocuments,
  });
}

import { AppError } from "../middleware/errors";
import {
  createLenderProduct,
  listLenderProducts,
  listLenderProductsByLenderId,
  updateLenderProduct,
} from "../repositories/lenderProducts.repo";
import { type RequiredDocument } from "../db/schema/lenderProducts";

export const DEFAULT_LENDER_PRODUCT_NAME = "Unnamed Product";

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
}): Promise<Awaited<ReturnType<typeof listLenderProducts>>> {
  return listLenderProducts(params);
}

export async function listLenderProductsByLenderIdService(params: {
  lenderId: string;
}): Promise<Awaited<ReturnType<typeof listLenderProductsByLenderId>>> {
  return listLenderProductsByLenderId(params);
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

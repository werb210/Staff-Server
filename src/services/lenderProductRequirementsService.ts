import { AppError } from "../middleware/errors";
import {
  countLenderProductRequirements,
  countRequiredLenderProductRequirements,
  createLenderProductRequirement,
  createRequirementSeeds,
  deleteLenderProductRequirement,
  getLenderProductRequirementById,
  listLenderProductRequirements,
  updateLenderProductRequirement,
} from "../repositories/lenderProductRequirements.repo";
import { logInfo, logWarn } from "../observability/logger";
import { pool } from "../db";

export type LenderProductRequirement = {
  id: string;
  documentType: string;
  required: boolean;
  minAmount: number | null;
  maxAmount: number | null;
};

type RequirementSeedDefinition = {
  documentType: string;
  required: boolean;
};

type LenderProductLookup = {
  id: string;
  type: string;
  status: string;
};

const BASE_REQUIREMENTS_BY_TYPE: Record<string, RequirementSeedDefinition[]> = {
  loc: [
    { documentType: "bank_statement", required: true },
    { documentType: "id_document", required: true },
    { documentType: "void_cheque", required: true },
  ],
  term: [
    { documentType: "bank_statement", required: true },
    { documentType: "financial_statement", required: true },
    { documentType: "tax_return", required: true },
  ],
  factoring: [
    { documentType: "ar_aging", required: true },
    { documentType: "invoice", required: true },
    { documentType: "contract", required: true },
  ],
  standard: [
    { documentType: "bank_statement", required: true },
    { documentType: "id_document", required: true },
    { documentType: "void_cheque", required: true },
  ],
};

async function findLenderProductById(params: {
  id: string;
}): Promise<LenderProductLookup | null> {
  const res = await pool.query<LenderProductLookup>(
    `select id, type, status
     from lender_products
     where id = $1
     limit 1`,
    [params.id]
  );
  return res.rows[0] ?? null;
}

async function findActiveLenderProductByType(params: {
  type: string;
}): Promise<LenderProductLookup | null> {
  const res = await pool.query<LenderProductLookup>(
    `select id, type, status
     from lender_products
     where type = $1
       and status = 'active'
     order by created_at asc
     limit 1`,
    [params.type]
  );
  return res.rows[0] ?? null;
}

function mapRequirement(record: {
  id: string;
  document_type: string;
  required: boolean;
  min_amount: number | null;
  max_amount: number | null;
}): LenderProductRequirement {
  return {
    id: record.id,
    documentType: record.document_type,
    required: record.required,
    minAmount: record.min_amount,
    maxAmount: record.max_amount,
  };
}

export async function resolveLenderProductRequirements(params: {
  lenderProductId: string;
  requestedAmount?: number | null;
}): Promise<LenderProductRequirement[]> {
  const requirements = await listLenderProductRequirements({
    lenderProductId: params.lenderProductId,
    requestedAmount: params.requestedAmount ?? null,
  });
  const mapped = requirements.map(mapRequirement);
  logInfo("lender_product_requirements_resolved", {
    lenderProductId: params.lenderProductId,
    requestedAmount: params.requestedAmount ?? null,
    total: mapped.length,
    requiredCount: mapped.filter((req) => req.required).length,
  });
  return mapped;
}

export async function resolveRequirementsForProductType(params: {
  productType: string;
  requestedAmount?: number | null;
}): Promise<{ requirements: LenderProductRequirement[]; lenderProductId: string } > {
  const product = await findActiveLenderProductByType({ type: params.productType });
  if (!product) {
    logWarn("lender_product_type_missing", { productType: params.productType });
    throw new AppError("invalid_product", "Unsupported product type.", 400);
  }
  const requirements = await resolveLenderProductRequirements({
    lenderProductId: product.id,
    requestedAmount: params.requestedAmount ?? null,
  });
  return { requirements, lenderProductId: product.id };
}

export async function resolveRequirementsForApplication(params: {
  lenderProductId: string | null;
  productType: string;
  requestedAmount?: number | null;
}): Promise<{ requirements: LenderProductRequirement[]; lenderProductId: string | null }> {
  if (params.lenderProductId) {
    const requirements = await resolveLenderProductRequirements({
      lenderProductId: params.lenderProductId,
      requestedAmount: params.requestedAmount ?? null,
    });
    return { requirements, lenderProductId: params.lenderProductId };
  }
  const product = await findActiveLenderProductByType({ type: params.productType });
  if (!product) {
    logWarn("lender_product_type_missing", {
      productType: params.productType,
    });
    return { requirements: [], lenderProductId: null };
  }
  const requirements = await resolveLenderProductRequirements({
    lenderProductId: product.id,
    requestedAmount: params.requestedAmount ?? null,
  });
  return { requirements, lenderProductId: product.id };
}

export async function ensureSeedRequirementsForProduct(params: {
  lenderProductId: string;
  productType: string;
}): Promise<number> {
  const baseRequirements = BASE_REQUIREMENTS_BY_TYPE[params.productType] ?? [];
  if (baseRequirements.length === 0) {
    return 0;
  }
  const existingCount = await countLenderProductRequirements({
    lenderProductId: params.lenderProductId,
  });
  if (existingCount > 0) {
    return 0;
  }
  const seeded = await createRequirementSeeds({
    lenderProductId: params.lenderProductId,
    requirements: baseRequirements,
  });
  if (seeded > 0) {
    logInfo("lender_product_requirements_seeded", {
      lenderProductId: params.lenderProductId,
      productType: params.productType,
      count: seeded,
    });
  }
  return seeded;
}

export async function seedRequirementsForAllProducts(): Promise<void> {
  const res = await pool.query<{ id: string; type: string }>(
    "select id, type from lender_products"
  );
  for (const product of res.rows) {
    await ensureSeedRequirementsForProduct({
      lenderProductId: product.id,
      productType: product.type,
    });
  }
}

export async function listClientRequirements(params: {
  lenderProductId: string;
  requestedAmount?: number | null;
}): Promise<LenderProductRequirement[]> {
  const product = await findLenderProductById({ id: params.lenderProductId });
  if (!product || product.status !== "active") {
    throw new AppError("not_found", "Lender product not found.", 404);
  }
  const requirements = await resolveLenderProductRequirements({
    lenderProductId: params.lenderProductId,
    requestedAmount: params.requestedAmount ?? null,
  });
  return requirements.filter((req) => req.required);
}

export async function createRequirementForProduct(params: {
  lenderProductId: string;
  documentType: string;
  required?: boolean;
  minAmount?: number | null;
  maxAmount?: number | null;
}): Promise<LenderProductRequirement> {
  const product = await findLenderProductById({ id: params.lenderProductId });
  if (!product) {
    throw new AppError("not_found", "Lender product not found.", 404);
  }
  const created = await createLenderProductRequirement({
    lenderProductId: params.lenderProductId,
    documentType: params.documentType,
    required: params.required ?? true,
    minAmount: params.minAmount ?? null,
    maxAmount: params.maxAmount ?? null,
  });
  return mapRequirement(created);
}

export async function updateRequirementForProduct(params: {
  id: string;
  documentType: string;
  required: boolean;
  minAmount?: number | null;
  maxAmount?: number | null;
}): Promise<LenderProductRequirement> {
  const existing = await getLenderProductRequirementById({ id: params.id });
  if (!existing) {
    throw new AppError("not_found", "Requirement not found.", 404);
  }
  const updated = await updateLenderProductRequirement({
    id: params.id,
    documentType: params.documentType,
    required: params.required,
    minAmount: params.minAmount ?? null,
    maxAmount: params.maxAmount ?? null,
  });
  if (!updated) {
    throw new AppError("not_found", "Requirement not found.", 404);
  }
  return mapRequirement(updated);
}

export async function deleteRequirementForProduct(params: {
  id: string;
}): Promise<LenderProductRequirement> {
  const existing = await getLenderProductRequirementById({ id: params.id });
  if (!existing) {
    throw new AppError("not_found", "Requirement not found.", 404);
  }
  if (existing.required) {
    const remainingRequired = await countRequiredLenderProductRequirements({
      lenderProductId: existing.lender_product_id,
    });
    if (remainingRequired <= 1) {
      throw new AppError(
        "validation_error",
        "Cannot delete the last required document.",
        400
      );
    }
  }
  const deleted = await deleteLenderProductRequirement({ id: params.id });
  if (!deleted) {
    throw new AppError("not_found", "Requirement not found.", 404);
  }
  return mapRequirement(deleted);
}

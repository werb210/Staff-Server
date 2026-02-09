import { type Request, type Response } from "express";
import { AppError } from "../middleware/errors";
import {
  createRequirementForProduct,
  deleteRequirementForProduct,
  listClientRequirements,
  resolveLenderProductRequirements,
  updateRequirementForProduct,
} from "../services/lenderProductRequirementsService";
import { normalizeRequiredDocumentKey } from "../db/schema/requiredDocuments";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value: string, label: string): void {
  if (!UUID_REGEX.test(value)) {
    throw new AppError("validation_error", `Invalid ${label}.`, 400);
  }
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

function parseDocumentType(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError("validation_error", "document_type is required.", 400);
  }
  const normalized = normalizeRequiredDocumentKey(value);
  if (!normalized) {
    throw new AppError("validation_error", "document_type is invalid.", 400);
  }
  return normalized;
}

function parseRequired(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }
  if (typeof value === "boolean") {
    return value;
  }
  throw new AppError("validation_error", "required must be a boolean.", 400);
}

export async function listClientLenderProductRequirementsHandler(
  req: Request,
  res: Response
): Promise<void> {
  const lenderProductId = req.params.id;
  if (!lenderProductId || !UUID_REGEX.test(lenderProductId)) {
    res.status(400).json({ ok: false, error: "INVALID_LENDER_PRODUCT_ID" });
    return;
  }

  const requestedAmountRaw = req.query.requestedAmount;
  let requestedAmount: number | null = null;
  if (requestedAmountRaw !== undefined) {
    const parsed = Number(requestedAmountRaw);
    if (Number.isNaN(parsed)) {
      throw new AppError(
        "validation_error",
        "requestedAmount must be a number.",
        400
      );
    }
    requestedAmount = parsed;
  }

  const requirements = await listClientRequirements({
    lenderProductId,
    requestedAmount,
  });

  res.status(200).json({
    productId: lenderProductId,
    requirements: requirements.map((requirement) => ({
      documentType: requirement.documentType,
      required: requirement.required,
    })),
  });
}

export async function listLenderProductRequirementsHandler(
  req: Request,
  res: Response
): Promise<void> {
  const lenderProductId = req.params.id;
  if (!lenderProductId) {
    throw new AppError("validation_error", "lender product id is required.", 400);
  }
  assertUuid(lenderProductId, "lender product id");

  const requestedAmountRaw = req.query.requestedAmount;
  let requestedAmount: number | null = null;
  if (requestedAmountRaw !== undefined) {
    const parsed = Number(requestedAmountRaw);
    if (Number.isNaN(parsed)) {
      throw new AppError(
        "validation_error",
        "requestedAmount must be a number.",
        400
      );
    }
    requestedAmount = parsed;
  }

  const requirements = await resolveLenderProductRequirements({
    lenderProductId,
    requestedAmount,
  });

  res.status(200).json({
    productId: lenderProductId,
    requirements: requirements.map((requirement) => ({
      id: requirement.id,
      documentType: requirement.documentType,
      required: requirement.required,
      minAmount: requirement.minAmount,
      maxAmount: requirement.maxAmount,
    })),
  });
}

export async function createLenderProductRequirementHandler(
  req: Request,
  res: Response
): Promise<void> {
  const lenderProductId = req.params.id;
  if (!lenderProductId) {
    throw new AppError("validation_error", "lender product id is required.", 400);
  }
  assertUuid(lenderProductId, "lender product id");
  const documentType = parseDocumentType(req.body?.document_type);
  const required = parseRequired(req.body?.required);
  const minAmount = parseAmount(req.body?.min_amount, "min_amount");
  const maxAmount = parseAmount(req.body?.max_amount, "max_amount");

  const requirement = await createRequirementForProduct({
    lenderProductId,
    documentType,
    required,
    minAmount,
    maxAmount,
  });

  res.status(201).json({ requirement });
}

export async function updateLenderProductRequirementHandler(
  req: Request,
  res: Response
): Promise<void> {
  const lenderProductId = req.params.id;
  const requirementId = req.params.reqId;
  if (!lenderProductId) {
    throw new AppError("validation_error", "lender product id is required.", 400);
  }
  if (!requirementId) {
    throw new AppError("validation_error", "requirement id is required.", 400);
  }
  assertUuid(lenderProductId, "lender product id");
  assertUuid(requirementId, "requirement id");
  const documentType = parseDocumentType(req.body?.document_type);
  const required = parseRequired(req.body?.required);
  const minAmount = parseAmount(req.body?.min_amount, "min_amount");
  const maxAmount = parseAmount(req.body?.max_amount, "max_amount");

  const requirement = await updateRequirementForProduct({
    id: requirementId,
    documentType,
    required,
    minAmount,
    maxAmount,
  });

  res.status(200).json({ requirement });
}

export async function deleteLenderProductRequirementHandler(
  req: Request,
  res: Response
): Promise<void> {
  const lenderProductId = req.params.id;
  const requirementId = req.params.reqId;
  if (!lenderProductId) {
    throw new AppError("validation_error", "lender product id is required.", 400);
  }
  if (!requirementId) {
    throw new AppError("validation_error", "requirement id is required.", 400);
  }
  assertUuid(lenderProductId, "lender product id");
  assertUuid(requirementId, "requirement id");
  const requirement = await deleteRequirementForProduct({ id: requirementId });
  res.status(200).json({ requirement });
}

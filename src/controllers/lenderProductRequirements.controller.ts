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
  if (!UUID_REGEX.test(req.params.id)) {
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
    lenderProductId: req.params.id,
    requestedAmount,
  });

  res.status(200).json({
    productId: req.params.id,
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
  assertUuid(req.params.id, "lender product id");

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
    lenderProductId: req.params.id,
    requestedAmount,
  });

  res.status(200).json({
    productId: req.params.id,
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
  assertUuid(req.params.id, "lender product id");
  const documentType = parseDocumentType(req.body?.document_type);
  const required = parseRequired(req.body?.required);
  const minAmount = parseAmount(req.body?.min_amount, "min_amount");
  const maxAmount = parseAmount(req.body?.max_amount, "max_amount");

  const requirement = await createRequirementForProduct({
    lenderProductId: req.params.id,
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
  assertUuid(req.params.id, "lender product id");
  assertUuid(req.params.reqId, "requirement id");
  const documentType = parseDocumentType(req.body?.document_type);
  const required = parseRequired(req.body?.required);
  const minAmount = parseAmount(req.body?.min_amount, "min_amount");
  const maxAmount = parseAmount(req.body?.max_amount, "max_amount");

  const requirement = await updateRequirementForProduct({
    id: req.params.reqId,
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
  assertUuid(req.params.id, "lender product id");
  assertUuid(req.params.reqId, "requirement id");
  const requirement = await deleteRequirementForProduct({ id: req.params.reqId });
  res.status(200).json({ requirement });
}

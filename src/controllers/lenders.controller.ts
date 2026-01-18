import { type Request, type Response } from "express";
import { AppError } from "../middleware/errors";
import { createLender, listLenders, type LenderRecord } from "../repositories/lenders.repo";

export type LenderResponse = {
  id: string;
  name: string;
  phone: string;
  website: string | null;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toLenderResponse(record: LenderRecord): LenderResponse {
  return {
    id: record.id,
    name: record.name,
    phone: record.phone,
    website: record.website,
    description: record.description,
    active: record.active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function assertLenderRecord(record: LenderRecord): void {
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.name !== "string" ||
    typeof record.phone !== "string" ||
    typeof record.active !== "boolean" ||
    !(record.created_at instanceof Date) ||
    !(record.updated_at instanceof Date)
  ) {
    throw new AppError("data_error", "Invalid lender record.", 500);
  }
}

export async function listLendersHandler(
  _req: Request,
  res: Response
): Promise<void> {
  const lenders = await listLenders();
  if (!Array.isArray(lenders)) {
    throw new AppError("data_error", "Invalid lenders list.", 500);
  }
  lenders.forEach(assertLenderRecord);
  res.status(200).json(lenders.map(toLenderResponse));
}

export async function createLenderHandler(
  req: Request,
  res: Response
): Promise<void> {
  const { name, phone, website, description, active } = req.body ?? {};
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new AppError("validation_error", "name is required.", 400);
  }
  if (typeof phone !== "string" || phone.trim().length === 0) {
    throw new AppError("validation_error", "phone is required.", 400);
  }
  if (website !== undefined && website !== null && typeof website !== "string") {
    throw new AppError("validation_error", "website must be a string.", 400);
  }
  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    throw new AppError("validation_error", "description must be a string.", 400);
  }
  if (active !== undefined && typeof active !== "boolean") {
    throw new AppError("validation_error", "active must be a boolean.", 400);
  }
  const created = await createLender({
    name: name.trim(),
    phone: phone.trim(),
    website: typeof website === "string" ? website.trim() : null,
    description: typeof description === "string" ? description.trim() : null,
    active: typeof active === "boolean" ? active : true,
  });
  res.status(201).json(toLenderResponse(created));
}

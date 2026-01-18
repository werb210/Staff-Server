import { type Request, type Response } from "express";
import { AppError } from "../middleware/errors";
import { createLender, listLenders } from "../repositories/lenders.repo";
import {
  LENDER_SUBMISSION_METHODS,
  type LenderRecord,
  type LenderSubmissionMethod,
} from "../db/schema/lenders";

export type LenderResponse = {
  id: string;
  name: string;
  active: boolean;
  phone: string | null;
  website: string | null;
  description: string | null;
  street: string | null;
  city: string | null;
  region: string | null;
  country: string;
  postalCode: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  submissionMethod: string | null;
  submissionEmail: string | null;
  createdAt: Date;
};

function toLenderResponse(record: LenderRecord): LenderResponse {
  return {
    id: record.id,
    name: record.name,
    active: record.active,
    phone: record.phone,
    website: record.website,
    description: record.description,
    street: record.street,
    city: record.city,
    region: record.region,
    country: record.country,
    postalCode: record.postal_code,
    contactName: record.contact_name,
    contactEmail: record.contact_email,
    contactPhone: record.contact_phone,
    submissionMethod: record.submission_method,
    submissionEmail: record.submission_email,
    createdAt: record.created_at,
  };
}

function assertLenderRecord(record: LenderRecord): void {
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.name !== "string" ||
    typeof record.active !== "boolean" ||
    typeof record.country !== "string" ||
    !(record.created_at instanceof Date)
  ) {
    throw new AppError("data_error", "Invalid lender record.", 500);
  }
}

export async function listLendersHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const lenders = await listLenders();
    if (!Array.isArray(lenders)) {
      res.status(200).json({ items: [] });
      return;
    }
    lenders.forEach(assertLenderRecord);
    res.status(200).json({ items: lenders.map(toLenderResponse) });
  } catch (err) {
    res.status(200).json({ items: [] });
  }
}

export async function createLenderHandler(
  req: Request,
  res: Response
): Promise<void> {
  const {
    name,
    country,
    active,
    phone,
    website,
    description,
    street,
    city,
    region,
    postalCode,
    contactName,
    contactEmail,
    contactPhone,
    submissionMethod,
    submissionEmail,
  } = req.body ?? {};
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new AppError("validation_error", "name is required.", 400);
  }
  if (typeof country !== "string" || country.trim().length === 0) {
    throw new AppError("validation_error", "country is required.", 400);
  }
  if (phone !== undefined && phone !== null && typeof phone !== "string") {
    throw new AppError("validation_error", "phone must be a string.", 400);
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
  if (street !== undefined && street !== null && typeof street !== "string") {
    throw new AppError("validation_error", "street must be a string.", 400);
  }
  if (city !== undefined && city !== null && typeof city !== "string") {
    throw new AppError("validation_error", "city must be a string.", 400);
  }
  if (region !== undefined && region !== null && typeof region !== "string") {
    throw new AppError("validation_error", "region must be a string.", 400);
  }
  if (
    postalCode !== undefined &&
    postalCode !== null &&
    typeof postalCode !== "string"
  ) {
    throw new AppError("validation_error", "postalCode must be a string.", 400);
  }
  if (
    contactName !== undefined &&
    contactName !== null &&
    typeof contactName !== "string"
  ) {
    throw new AppError("validation_error", "contactName must be a string.", 400);
  }
  if (
    contactEmail !== undefined &&
    contactEmail !== null &&
    typeof contactEmail !== "string"
  ) {
    throw new AppError("validation_error", "contactEmail must be a string.", 400);
  }
  if (
    contactPhone !== undefined &&
    contactPhone !== null &&
    typeof contactPhone !== "string"
  ) {
    throw new AppError("validation_error", "contactPhone must be a string.", 400);
  }
  if (
    submissionMethod !== undefined &&
    submissionMethod !== null &&
    (typeof submissionMethod !== "string" ||
      !LENDER_SUBMISSION_METHODS.includes(
        submissionMethod as LenderSubmissionMethod
      ))
  ) {
    throw new AppError(
      "validation_error",
      "submissionMethod must be EMAIL or API.",
      400
    );
  }
  if (
    submissionEmail !== undefined &&
    submissionEmail !== null &&
    typeof submissionEmail !== "string"
  ) {
    throw new AppError("validation_error", "submissionEmail must be a string.", 400);
  }
  const created = await createLender({
    name: name.trim(),
    active: typeof active === "boolean" ? active : true,
    country: country.trim(),
    phone: typeof phone === "string" ? phone.trim() || null : null,
    website: typeof website === "string" ? website.trim() || null : null,
    description: typeof description === "string" ? description.trim() || null : null,
    street: typeof street === "string" ? street.trim() || null : null,
    city: typeof city === "string" ? city.trim() || null : null,
    region: typeof region === "string" ? region.trim() || null : null,
    postalCode: typeof postalCode === "string" ? postalCode.trim() || null : null,
    contactName: typeof contactName === "string" ? contactName.trim() || null : null,
    contactEmail:
      typeof contactEmail === "string" ? contactEmail.trim() || null : null,
    contactPhone:
      typeof contactPhone === "string" ? contactPhone.trim() || null : null,
    submissionMethod:
      typeof submissionMethod === "string"
        ? (submissionMethod as LenderSubmissionMethod)
        : null,
    submissionEmail:
      typeof submissionEmail === "string" ? submissionEmail.trim() || null : null,
  });
  // Portal contract: POST /api/lenders returns the created lender object (not wrapped).
  res.status(201).json(toLenderResponse(created));
}

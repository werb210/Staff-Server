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

function respondWithError(
  res: Response,
  status: number,
  code: string,
  message: string
): void {
  const requestId = res.locals.requestId ?? "unknown";
  res.status(status).json({ code, message, requestId });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function detectDbErrorStatus(err: unknown): { status: number; code: string; message: string } {
  const error = err as { code?: string; message?: string };
  const dbCode = typeof error.code === "string" ? error.code : null;
  if (dbCode === "23505") {
    return {
      status: 409,
      code: "duplicate_lender",
      message: "A lender with that name already exists.",
    };
  }
  if (dbCode === "23502" || dbCode === "23503" || dbCode === "23514") {
    return {
      status: 409,
      code: "constraint_violation",
      message: "Request violates a database constraint.",
    };
  }
  return {
    status: 500,
    code: "server_error",
    message: error.message ?? "An unexpected error occurred.",
  };
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
  const body = isPlainObject(req.body) ? req.body : {};
  const name = body.name;
  const country = body.country;
  const active = body.active;
  const phone = body.phone;
  const website = body.website;
  const description = body.description;
  const street = body.street;
  const city = body.city;
  const region = body.region;
  const postalCode = body.postalCode;
  const contactName = body.contactName;
  const contactEmail = body.contactEmail;
  const contactPhone = body.contactPhone;
  const submissionMethod = body.submissionMethod;
  const submissionEmail = body.submissionEmail;

  if (typeof name !== "string" || name.trim().length === 0) {
    respondWithError(res, 400, "validation_error", "name is required.");
    return;
  }
  if (country !== undefined && country !== null && typeof country !== "string") {
    respondWithError(res, 400, "validation_error", "country must be a string.");
    return;
  }
  if (phone !== undefined && phone !== null && typeof phone !== "string") {
    respondWithError(res, 400, "validation_error", "phone must be a string.");
    return;
  }
  if (website !== undefined && website !== null && typeof website !== "string") {
    respondWithError(res, 400, "validation_error", "website must be a string.");
    return;
  }
  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    respondWithError(res, 400, "validation_error", "description must be a string.");
    return;
  }
  if (active !== undefined && typeof active !== "boolean") {
    respondWithError(res, 400, "validation_error", "active must be a boolean.");
    return;
  }
  if (street !== undefined && street !== null && typeof street !== "string") {
    respondWithError(res, 400, "validation_error", "street must be a string.");
    return;
  }
  if (city !== undefined && city !== null && typeof city !== "string") {
    respondWithError(res, 400, "validation_error", "city must be a string.");
    return;
  }
  if (region !== undefined && region !== null && typeof region !== "string") {
    respondWithError(res, 400, "validation_error", "region must be a string.");
    return;
  }
  if (
    postalCode !== undefined &&
    postalCode !== null &&
    typeof postalCode !== "string"
  ) {
    respondWithError(res, 400, "validation_error", "postalCode must be a string.");
    return;
  }
  if (
    contactName !== undefined &&
    contactName !== null &&
    typeof contactName !== "string"
  ) {
    respondWithError(res, 400, "validation_error", "contactName must be a string.");
    return;
  }
  if (
    contactEmail !== undefined &&
    contactEmail !== null &&
    typeof contactEmail !== "string"
  ) {
    respondWithError(res, 400, "validation_error", "contactEmail must be a string.");
    return;
  }
  if (
    contactPhone !== undefined &&
    contactPhone !== null &&
    typeof contactPhone !== "string"
  ) {
    respondWithError(res, 400, "validation_error", "contactPhone must be a string.");
    return;
  }
  if (
    submissionMethod !== undefined &&
    submissionMethod !== null &&
    (typeof submissionMethod !== "string" ||
      !LENDER_SUBMISSION_METHODS.includes(
        submissionMethod as LenderSubmissionMethod
      ))
  ) {
    respondWithError(
      res,
      400,
      "validation_error",
      "submissionMethod must be EMAIL or API."
    );
    return;
  }
  if (
    submissionEmail !== undefined &&
    submissionEmail !== null &&
    typeof submissionEmail !== "string"
  ) {
    respondWithError(res, 400, "validation_error", "submissionEmail must be a string.");
    return;
  }

  const resolvedCountry =
    typeof country === "string" && country.trim().length > 0
      ? country.trim()
      : "US";

  try {
    const created = await createLender({
      name: name.trim(),
      active: typeof active === "boolean" ? active : true,
      country: resolvedCountry,
      phone: normalizeOptionalString(phone),
      website: normalizeOptionalString(website),
      description: normalizeOptionalString(description),
      street: normalizeOptionalString(street),
      city: normalizeOptionalString(city),
      region: normalizeOptionalString(region),
      postalCode: normalizeOptionalString(postalCode),
      contactName: normalizeOptionalString(contactName),
      contactEmail: normalizeOptionalString(contactEmail),
      contactPhone: normalizeOptionalString(contactPhone),
      submissionMethod:
        typeof submissionMethod === "string"
          ? (submissionMethod as LenderSubmissionMethod)
          : null,
      submissionEmail: normalizeOptionalString(submissionEmail),
    });
    // Portal contract: POST /api/lenders returns the created lender object (not wrapped).
    res.status(201).json(toLenderResponse(created));
  } catch (err) {
    const failure = detectDbErrorStatus(err);
    respondWithError(res, failure.status, failure.code, failure.message);
  }
}

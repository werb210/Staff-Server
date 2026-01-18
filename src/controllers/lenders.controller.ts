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

export async function listLendersHandler(
  _req: Request,
  res: Response
): Promise<void> {
  const lenders = await listLenders();
  res.status(200).json({ items: lenders.map(toLenderResponse) });
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
  const created = await createLender({
    name: name.trim(),
    phone: phone.trim(),
    website: typeof website === "string" ? website.trim() : null,
    description: typeof description === "string" ? description.trim() : null,
    active: typeof active === "boolean" ? active : true,
  });
  res.status(201).json(toLenderResponse(created));
}

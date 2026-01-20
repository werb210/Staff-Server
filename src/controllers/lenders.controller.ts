import { Request, Response } from "express";
import * as repo from "../repositories/lenders.repo";

export async function listLenders(_req: Request, res: Response) {
  const lenders = await repo.listLenders();
  return res.json(lenders);
}

export async function createLender(req: Request, res: Response) {
  const {
    name,
    country,
    submissionMethod,
    email,
    phone,
    website,
    postal_code
  } = req.body ?? {};

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "name_required" });
  }
  if (!country || typeof country !== "string") {
    return res.status(400).json({ error: "country_required" });
  }

  const normalizedSubmissionMethod =
    typeof submissionMethod === "string"
      ? submissionMethod.toLowerCase()
      : null;

  const lender = await repo.createLender({
    name,
    country,
    submission_method: normalizedSubmissionMethod,
    email: email ?? null,
    phone: phone ?? null,
    website: website ?? null,
    postal_code: postal_code ?? null
  });

  return res.status(201).json(lender);
}

import { randomUUID } from "crypto";
import { type Request, type Response } from "express";
import { pool } from "../db";
import { type LenderProductRecord } from "../db/schema/lenderProducts";

export async function listLendersHandler(
  _req: Request,
  res: Response
): Promise<void> {
  const result = await pool.query<LenderProductRecord>(
    `select id, lender_id, name, description, active, required_documents, created_at, updated_at
     from lender_products
     order by created_at desc`
  );
  res.status(200).json({ items: result.rows });
}

export async function createLenderHandler(
  req: Request,
  res: Response
): Promise<void> {
  const payload = req.body ?? {};
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!name) {
    res.status(400).json({
      error: "validation_error",
      message: "name is required",
    });
    return;
  }

  const lenderId =
    typeof payload.lenderId === "string"
      ? payload.lenderId.trim()
      : typeof payload.lender_id === "string"
      ? payload.lender_id.trim()
      : randomUUID();

  const description =
    typeof payload.description === "string" ? payload.description.trim() : null;
  const active = typeof payload.active === "boolean" ? payload.active : true;
  const rawRequiredDocuments =
    payload.required_documents ?? payload.requiredDocuments ?? null;
  if (
    rawRequiredDocuments !== null &&
    rawRequiredDocuments !== undefined &&
    !Array.isArray(rawRequiredDocuments)
  ) {
    res.status(400).json({
      error: "validation_error",
      message: "required_documents must be an array",
    });
    return;
  }

  const result = await pool.query<LenderProductRecord>(
    `insert into lender_products
     (id, lender_id, name, description, active, required_documents, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, now(), now())
     returning id, lender_id, name, description, active, required_documents, created_at, updated_at`,
    [
      randomUUID(),
      lenderId,
      name,
      description,
      active,
      rawRequiredDocuments ?? null,
    ]
  );

  res.status(201).json(result.rows[0]);
}

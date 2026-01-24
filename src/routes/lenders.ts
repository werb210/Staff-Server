import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import { safeHandler } from "../middleware/safeHandler";
import { ROLES } from "../auth/roles";
import { createLender, getLenderWithProducts } from "../controllers/lenders.controller";

type LenderProductRow = {
  id: string;
  lender_id: string;
  name: string | null;
  description: string | null;
  active: boolean | null;
  required_documents: unknown;
  created_at: string | null;
  updated_at: string | null;
};

type LenderRow = {
  id: string;
  name: string | null;
  country: string | null;
  submission_method: string[] | string | null;
  products: LenderProductRow[] | null;
  silo?: string | null;
};

const DEFAULT_SILO = "default";

function resolveSilo(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return DEFAULT_SILO;
}

function filterBySilo<T extends { silo?: string | null }>(records: T[], silo: string): T[] {
  return records.filter((record) => resolveSilo(record.silo) === silo);
}

const router = Router();

if (process.env.NODE_ENV === "test") {
  router.get(
    "/__test-error",
    safeHandler(() => {
      throw new Error("lenders test error");
    })
  );
}

router.get(
  "/",
  requireAuth,
  requireCapability([CAPABILITIES.LENDERS_READ]),
  safeHandler(async (req, res) => {
    const lendersResult = await pool.query<LenderRow>(
      `
      SELECT
        id,
        name,
        country,
        submission_method
      FROM lenders
      ORDER BY created_at DESC
      `
    );
    const productsResult = await pool.query<LenderProductRow>(
      `
      SELECT
        id,
        lender_id,
        name,
        description,
        active,
        required_documents,
        created_at,
        updated_at
      FROM lender_products
      ORDER BY created_at DESC
      `
    );

    const productsByLender = new Map<string, LenderProductRow[]>();
    productsResult.rows.forEach((product) => {
      const list = productsByLender.get(product.lender_id) ?? [];
      list.push(product);
      productsByLender.set(product.lender_id, list);
    });

    const normalized = lendersResult.rows.map((l: LenderRow) => ({
      id: l.id,
      name: l.name ?? "—",
      country: l.country ?? null,
      submission_method: Array.isArray(l.submission_method)
        ? l.submission_method
        : [],
      products: productsByLender.get(l.id) ?? [],
    }));
    const normalizedById = new Map(normalized.map((l) => [l.id, l]));

    const user = req.user;
    if (user?.role === ROLES.LENDER) {
      const lenderId = user.lenderId;
      const scoped = lenderId
        ? normalized.filter((l) => l.id === lenderId)
        : [];
      res.status(200).json(scoped);
      return;
    }
    if (user?.role === ROLES.ADMIN || user?.role === ROLES.OPS) {
      res.status(200).json(normalized);
      return;
    }
    const resolvedSilo = resolveSilo(req.user?.silo);
    const filtered = filterBySilo(lendersResult.rows, resolvedSilo)
      .map((row) => normalizedById.get(row.id))
      .filter((entry): entry is (typeof normalized)[number] => Boolean(entry));
    res.status(200).json(filtered);
  })
);

router.get(
  "/:id/products",
  requireAuth,
  requireCapability([CAPABILITIES.LENDERS_READ]),
  safeHandler(getLenderWithProducts)
);

router.post(
  "/",
  requireAuth,
  requireCapability([CAPABILITIES.OPS_MANAGE]),
  safeHandler(createLender)
);

export default router;

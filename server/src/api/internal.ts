import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, pgPool } from "../db/client";
import {
  applications,
  applicantOwners,
  bankingAnalysis,
  lenderProducts,
  ocrResults,
} from "../db/schema";
import { requireAuth } from "../middleware/requireAuth";
import { CreditSummaryEngine } from "../ai/creditSummaryEngine";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.use(requireAuth);

router.get("/db", async (_req, res) => {
  try {
    const result = await pgPool.query("select 1 as ok");
    res.json({ ok: true, result: result.rows[0].ok });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/application/:id/ai-context", async (req, res, next) => {
  try {
    const [app] = await db.select().from(applications).where(eq(applications.id, req.params.id)).limit(1);
    if (!app) return res.status(404).json({ error: "Application not found" });

    const [owners, ocr, banking, lender] = await Promise.all([
      db.select().from(applicantOwners).where(eq(applicantOwners.applicationId, req.params.id)),
      db.select().from(ocrResults).where(eq(ocrResults.applicationId, req.params.id)),
      db.select().from(bankingAnalysis).where(eq(bankingAnalysis.applicationId, req.params.id)),
      db
        .select()
        .from(lenderProducts)
        .where(eq(lenderProducts.id, (app.productSelection as any)?.lenderProductId ?? ""))
        .limit(1),
    ]);

    res.json({
      application: app,
      owners,
      ocrResults: ocr,
      bankingAnalysis: banking,
      lenderProduct: lender[0] ?? null,
      websiteUrl: (app.businessData as any)?.websiteUrl ?? null,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/application/:id/credit-summary/regenerate", async (req, res, next) => {
  try {
    const engine = new CreditSummaryEngine();
    const context = req.body.context ?? {};
    const result = await engine.generate({ applicationId: req.params.id, userId: req.user?.id, context });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/routes", (req, res) => {
  const routes: string[] = [];
  const stack: any[] = (req.app as any)._router?.stack ?? [];
  for (const layer of stack) {
    if (layer.route?.path) {
      routes.push(`${Object.keys(layer.route.methods).join(",").toUpperCase()} ${layer.route.path}`);
    }
    if (layer.name === "router" && layer.handle?.stack) {
      for (const nested of layer.handle.stack) {
        if (nested.route?.path) {
          routes.push(`${Object.keys(nested.route.methods).join(",").toUpperCase()} ${nested.route.path}`);
        }
      }
    }
  }
  res.json({ routes });
});

export default router;

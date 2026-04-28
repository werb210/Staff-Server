// BF_CREDIT_SUMMARY_v45 — V1 step 7 endpoints.
//   POST /api/credit-summary                          (body: { applicationId, sections? } — saves edits)
//   GET  /api/credit-summary/:applicationId           (returns current; auto-generates if none)
//   POST /api/credit-summary/:applicationId/regenerate  (re-runs engine, increments version)
//   POST /api/credit-summary/:applicationId/submit      (status='submitted', stamps applications.credit_summary_completed_at)
//
// Lock-after-submit state machine is OUT OF SCOPE per ruling 10.
// is_locked column exists on the table but no endpoint flips it; that's V2 work.
import { Router } from "express";
import { AppError } from "../middleware/errors.js";
import { safeHandler } from "../middleware/safeHandler.js";
import { requireAuth } from "../middleware/auth.js";
import {
  generateCreditSummary,
  buildSectionsFromInputs,
  loadGenerationInputs,
  type CreditSummarySections,
} from "../services/credit/generateCreditSummary.js";
import {
  findByApplication,
  upsertGenerated,
  listVersions,
} from "../services/credit/creditSummary.repo.js";

const router = Router();

function actorId(req: { user?: { userId?: string | null } | null }): string | null {
  return req.user?.userId ?? null;
}

/**
 * GET /api/credit-summary/:applicationId
 * Returns the current credit summary for the application. If none exists, the
 * engine runs once, the result is persisted, and the persisted row is returned.
 */
router.get(
  "/:applicationId",
  requireAuth,
  safeHandler(async (req: any, res: any) => {
    const applicationId = String(req.params.applicationId ?? "").trim();
    if (!applicationId) throw new AppError("validation_error", "applicationId required.", 400);

    const existing = await findByApplication(applicationId);
    if (existing) {
      return res.status(200).json({
        ok: true,
        credit_summary: existing,
        versions: await listVersions(applicationId, 20),
      });
    }
    const { sections, inputs } = await generateCreditSummary(applicationId);
    const row = await upsertGenerated({
      applicationId,
      sections,
      inputsSnapshot: inputs,
      reason: "generated",
      createdBy: actorId(req),
    });
    return res.status(200).json({ ok: true, credit_summary: row, versions: await listVersions(applicationId, 20) });
  })
);

/**
 * POST /api/credit-summary
 * Back-compat endpoint. Body: { applicationId, sections? } where `sections`
 * is the new-shape CreditSummarySections object. If sections are absent, this
 * acts as a regenerate-and-save.
 *
 * Legacy uppercase-key body (Transaction, Overview, Collateral, Financial Summary,
 * Risks & Mitigants, Rationale for Approval) is accepted and mapped onto
 * narrative fields of the corresponding new sections.
 */
router.post(
  "/",
  requireAuth,
  safeHandler(async (req: any, res: any) => {
    const applicationId = typeof req.body?.applicationId === "string" ? req.body.applicationId.trim() : "";
    if (!applicationId) throw new AppError("validation_error", "applicationId is required.", 400);

    let sections: CreditSummarySections;
    let reason: "generated" | "edited" = "generated";
    let inputs = await loadGenerationInputs(applicationId);

    if (req.body?.sections && typeof req.body.sections === "object") {
      // New shape: caller has the full sections object.
      sections = req.body.sections as CreditSummarySections;
      reason = "edited";
    } else if (
      req.body?.Transaction || req.body?.Overview || req.body?.Collateral ||
      req.body?.["Financial Summary"] || req.body?.["Risks & Mitigants"] ||
      req.body?.["Rationale for Approval"]
    ) {
      // Legacy uppercase-keys shape: map narrative fields onto a generated base.
      const base = buildSectionsFromInputs(inputs);
      sections = {
        ...base,
        transaction:        { narrative: String(req.body.Transaction        ?? base.transaction.narrative) },
        business_overview:  { narrative: String(req.body.Overview           ?? base.business_overview.narrative) },
        financial_overview: { ...base.financial_overview, narrative: String(req.body["Financial Summary"] ?? base.financial_overview.narrative) },
        banking_analysis:   { ...base.banking_analysis, narrative: String(req.body.Collateral             ?? base.banking_analysis.narrative) },
        recommendation:     { ...base.recommendation, narrative: String(req.body["Risks & Mitigants"] ?? req.body["Rationale for Approval"] ?? base.recommendation.narrative) },
      };
      reason = "edited";
    } else {
      // Empty body — regenerate from scratch.
      sections = buildSectionsFromInputs(inputs);
      reason = "generated";
    }

    const row = await upsertGenerated({
      applicationId, sections, inputsSnapshot: inputs, reason, createdBy: actorId(req),
    });
    return res.status(200).json({ ok: true, credit_summary: row });
  })
);

/**
 * POST /api/credit-summary/:applicationId/regenerate
 * Re-runs the engine and saves a new version. Always reason='generated'.
 */
router.post(
  "/:applicationId/regenerate",
  requireAuth,
  safeHandler(async (req: any, res: any) => {
    const applicationId = String(req.params.applicationId ?? "").trim();
    if (!applicationId) throw new AppError("validation_error", "applicationId required.", 400);
    const { sections, inputs } = await generateCreditSummary(applicationId);
    const row = await upsertGenerated({
      applicationId, sections, inputsSnapshot: inputs, reason: "generated", createdBy: actorId(req),
    });
    return res.status(200).json({ ok: true, credit_summary: row });
  })
);

/**
 * POST /api/credit-summary/:applicationId/submit
 * Marks status='submitted', stamps generated_at + submitted_at + applications.credit_summary_completed_at.
 * Does NOT lock — lock state machine is deferred per ruling 10.
 */
router.post(
  "/:applicationId/submit",
  requireAuth,
  safeHandler(async (req: any, res: any) => {
    const applicationId = String(req.params.applicationId ?? "").trim();
    if (!applicationId) throw new AppError("validation_error", "applicationId required.", 400);

    const existing = await findByApplication(applicationId);
    if (!existing) throw new AppError("validation_error", "Credit summary has not been generated yet.", 400);

    const inputs = await loadGenerationInputs(applicationId);
    const row = await upsertGenerated({
      applicationId,
      sections: existing.sections,
      inputsSnapshot: inputs,
      reason: "submitted",
      createdBy: actorId(req),
    });
    return res.status(200).json({ ok: true, credit_summary: row });
  })
);

export default router;

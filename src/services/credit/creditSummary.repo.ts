// BF_CREDIT_SUMMARY_v45 — DB access layer for credit_summaries.
import { runQuery } from "../../lib/db.js";
import type { CreditSummarySections, GenerationInputs } from "./generateCreditSummary.js";

export interface CreditSummaryRow {
  id: string;
  application_id: string;
  sections: CreditSummarySections;
  inputs_snapshot: GenerationInputs | Record<string, unknown>;
  ai_suggestions: Record<string, unknown>;
  version: number;
  is_locked: boolean;
  status: "draft" | "submitted" | "locked";
  generated_at: Date | null;
  submitted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function findByApplication(applicationId: string): Promise<CreditSummaryRow | null> {
  const r = await runQuery<CreditSummaryRow>(
    `SELECT id, application_id, sections, inputs_snapshot, ai_suggestions,
            version, is_locked, status, generated_at, submitted_at, created_at, updated_at
       FROM credit_summaries
      WHERE application_id = $1
      LIMIT 1`,
    [applicationId]
  );
  return r.rows[0] ?? null;
}

export async function upsertGenerated(params: {
  applicationId: string;
  sections: CreditSummarySections;
  inputsSnapshot: GenerationInputs;
  reason: "generated" | "edited" | "submitted";
  createdBy: string | null;
}): Promise<CreditSummaryRow> {
  const { applicationId, sections, inputsSnapshot, reason, createdBy } = params;
  const sectionsJson = JSON.stringify(sections);
  const inputsJson = JSON.stringify(inputsSnapshot);

  // Upsert into credit_summaries, bumping version and stamping generated_at /
  // submitted_at as appropriate. Status only flips to 'submitted' when reason='submitted'.
  const upsert = await runQuery<CreditSummaryRow>(
    `INSERT INTO credit_summaries
       (application_id, sections, inputs_snapshot, version, status,
        generated_at, submitted_at, created_at, updated_at)
     VALUES
       ($1, $2::jsonb, $3::jsonb, 1,
        CASE WHEN $4 = 'submitted' THEN 'submitted' ELSE 'draft' END,
        now(),
        CASE WHEN $4 = 'submitted' THEN now() ELSE NULL END,
        now(), now())
     ON CONFLICT (application_id) DO UPDATE
       SET sections        = EXCLUDED.sections,
           inputs_snapshot = EXCLUDED.inputs_snapshot,
           version         = credit_summaries.version + 1,
           generated_at    = now(),
           submitted_at    = CASE WHEN $4 = 'submitted' THEN now()
                                  ELSE credit_summaries.submitted_at END,
           status          = CASE WHEN $4 = 'submitted' THEN 'submitted'
                                  ELSE credit_summaries.status END,
           updated_at      = now()
     RETURNING id, application_id, sections, inputs_snapshot, ai_suggestions,
               version, is_locked, status, generated_at, submitted_at, created_at, updated_at`,
    [applicationId, sectionsJson, inputsJson, reason]
  );
  const row = upsert.rows[0];

  // Append a version row.
  await runQuery(
    `INSERT INTO credit_summary_versions
       (credit_summary_id, application_id, version, sections, inputs_snapshot, reason, created_by)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)`,
    [row.id, applicationId, row.version, sectionsJson, inputsJson, reason, createdBy]
  );

  // If reason === 'submitted', also stamp applications.credit_summary_completed_at
  // for parity with existing applications.service.ts (lines 886/903).
  if (reason === "submitted") {
    await runQuery(
      `UPDATE applications
          SET credit_summary_completed_at = now(),
              updated_at = now()
        WHERE id::text = ($1)::text`,
      [applicationId]
    ).catch(() => undefined);
  }

  return row;
}

export async function listVersions(applicationId: string, limit = 50) {
  const r = await runQuery<{
    id: string;
    version: number;
    reason: string;
    created_by: string | null;
    created_at: Date;
  }>(
    `SELECT id, version, reason, created_by, created_at
       FROM credit_summary_versions
      WHERE application_id = $1
      ORDER BY version DESC
      LIMIT $2`,
    [applicationId, limit]
  );
  return r.rows;
}

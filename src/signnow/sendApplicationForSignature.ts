// BF_SERVER_BLOCK_v200_SIGNNOW_STUB_MODE_v1
//
// SignNow envelope sender. The orchestrator at
// src/services/submission/orchestrator.ts dynamically imports this module
// during Stage A of submission (after credit summary + lender selections
// are finalized). Until paid-tier SignNow is wired up, this file provides:
//
//   - **stub mode** (SIGNNOW_STUB_MODE=1): fake the entire envelope flow
//     end-to-end so the rest of the pipeline (package build, lender
//     dispatch, etc.) can be exercised without paying for SignNow.
//   - **default**: log a "pending" notice and return; matches today's
//     production no-op so non-test deploys are unaffected.
//
// The stub mirrors the real webhook handler in src/routes/signnow.ts
// exactly — stamps signnow_app_signed_at, purges SSN/SIN, inserts the
// send_lender_package job — so the downstream orchestrator can't tell
// the difference.
//
// Env vars:
//   SIGNNOW_STUB_MODE       — "1" / "true" enables stub. Anything else = off.
//   SIGNNOW_STUB_DELAY_MS   — milliseconds before the simulated signed
//                             callback fires (default 2000). Use a longer
//                             value (e.g. 30000) when testing UI states
//                             that show "awaiting signature".

import crypto from "node:crypto";
import { dbQuery } from "../db.js";
import { logCrmEvent } from "../modules/crm/crmTimeline.service.js";

type OrchestratorContext = {
  applicationId: string;
  pool?: unknown; // present in real ctx; we use dbQuery directly so unused here
};

type SendResult =
  | { ok: true;  mode: "stub"; documentId: string }
  | { ok: false; mode: "skipped"; reason: string };

function isStubMode(): boolean {
  const v = (process.env.SIGNNOW_STUB_MODE ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function stubDelayMs(): number {
  const raw = process.env.SIGNNOW_STUB_DELAY_MS;
  if (!raw) return 2000;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 2000;
}

export async function sendApplicationForSignature(
  ctx: OrchestratorContext
): Promise<SendResult> {
  if (!ctx?.applicationId) {
    return { ok: false, mode: "skipped", reason: "missing_application_id" };
  }
  if (isStubMode()) {
    return sendStub(ctx.applicationId);
  }
  // Real SignNow integration pending — matches the prior no-op behavior.
  // Orchestrator continues; Stage B will not fire because
  // signnow_app_signed_at remains null.
  console.log(
    `[signnow] real SignNow implementation pending; skipping for app=${ctx.applicationId}. ` +
    `Set SIGNNOW_STUB_MODE=1 to enable the test fake.`
  );
  return { ok: false, mode: "skipped", reason: "real_integration_pending" };
}

async function sendStub(applicationId: string): Promise<SendResult> {
  const documentId = `stub-${crypto.randomUUID()}`;
  const blobName = `stub://signed-application-${applicationId}.pdf`;

  console.log(
    `[signnow-stub] sending fake envelope app=${applicationId} documentId=${documentId}`
  );

  // Stamp the outbound side: signnow_document_id (so the webhook-style
  // lookup in src/routes/signnow.ts would match if real SignNow ever
  // called in for this same app), plus a stub blob pointer so the package
  // loader's COALESCE finds something non-null.
  await dbQuery(
    `UPDATE applications
        SET signnow_document_id = $1,
            metadata = COALESCE(metadata, '{}'::jsonb)
                       || jsonb_build_object(
                            'signed_application_blob_name', $2::text,
                            'signnow_stub', true,
                            'signnow_stub_sent_at',
                            to_char(now() AT TIME ZONE 'UTC',
                                    'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                          ),
            updated_at = now()
      WHERE id::text = ($3)::text`,
    [documentId, blobName, applicationId]
  );

  // Schedule the simulated signed webhook. Fire-and-forget so the
  // orchestrator's await returns quickly (matches real SignNow async
  // behavior — the API call returns 200 immediately, the webhook
  // callback fires minutes/hours later when the signer completes).
  const delayMs = stubDelayMs();
  setTimeout(() => {
    void simulateSignedWebhook(applicationId, documentId).catch((err) => {
      console.error(
        `[signnow-stub] simulated webhook failed for app=${applicationId}`,
        err
      );
    });
  }, delayMs).unref?.(); // unref so it doesn\'t block test process exit

  return { ok: true, mode: "stub", documentId };
}

async function simulateSignedWebhook(
  applicationId: string,
  documentId: string
): Promise<void> {
  console.log(
    `[signnow-stub] simulating signed callback app=${applicationId} documentId=${documentId}`
  );

  // Mirror src/routes/signnow.ts POST /webhooks/signnow status=document_signed.
  // Guard signnow_app_signed_at IS NULL so a late stub callback can't
  // overwrite a real signature timestamp if SignNow ever gets wired up
  // mid-flight.
  const stamped = await dbQuery<{ id: string }>(
    `UPDATE applications
        SET signnow_app_signed_at = now(), updated_at = now()
      WHERE id::text = ($1)::text
        AND signnow_app_signed_at IS NULL
      RETURNING id`,
    [applicationId]
  );
  if (stamped.rows.length === 0) {
    console.log(
      `[signnow-stub] app=${applicationId} already has signnow_app_signed_at — skipping callback`
    );
    return;
  }

  // PII purge — same as real webhook.
  await dbQuery(
    `UPDATE applicants
        SET ssn = null, sin = null, updated_at = now()
      WHERE application_id = $1`,
    [applicationId]
  ).catch((err) =>
    console.warn(`[signnow-stub] applicants purge failed app=${applicationId}`, err)
  );
  await dbQuery(
    `UPDATE application_partners
        SET ssn = null, sin = null, updated_at = now()
      WHERE application_id = $1`,
    [applicationId]
  ).catch((err) =>
    console.warn(
      `[signnow-stub] application_partners purge failed app=${applicationId}`,
      err
    )
  );

  // CRM timeline event — same eventType as real webhook so downstream
  // consumers can't distinguish.
  const contactRes = await dbQuery<{ crm_contact_id: string | null }>(
    `SELECT crm_contact_id FROM applications WHERE id::text = ($1)::text LIMIT 1`,
    [applicationId]
  ).catch(() => ({ rows: [] as Array<{ crm_contact_id: string | null }> }));
  const contactId = contactRes.rows[0]?.crm_contact_id;
  if (contactId) {
    await logCrmEvent({
      contactId,
      applicationId,
      eventType: "signnow_signed",
      payload: { documentId, stub: true },
    }).catch((err) =>
      console.warn(`[signnow-stub] logCrmEvent failed app=${applicationId}`, err)
    );
  }

  // Insert send_lender_package job — matches real webhook's BLOCK_v185 dedup.
  await dbQuery(
    `INSERT INTO job_queue (id, type, payload, status, created_at)
     VALUES (gen_random_uuid(), 'send_lender_package', $1::jsonb, 'pending', now())
     ON CONFLICT ((payload->>'applicationId'))
       WHERE type = 'send_lender_package' AND status IN ('pending','running')
       DO NOTHING`,
    [JSON.stringify({ applicationId })]
  ).catch((err) =>
    console.warn(
      `[signnow-stub] job_queue insert failed app=${applicationId}`,
      err
    )
  );

  console.log(
    `[signnow-stub] signed callback complete app=${applicationId} documentId=${documentId}`
  );
}

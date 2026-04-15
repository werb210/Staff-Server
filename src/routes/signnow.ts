import { Router } from "express";
import { safeHandler } from "../middleware/safeHandler.js";
import { dbQuery } from "../db.js";
import { logCrmEvent } from "../modules/crm/crmTimeline.service.js";

const router = Router();

router.post(
  "/webhooks/signnow",
  safeHandler(async (req: any, res: any) => {
    const { document_id, status, signer_email } = req.body ?? {};

    if (status !== "document_signed") {
      res.status(200).json({ received: true });
      return;
    }

    const appResult = await dbQuery<{ id: string; crm_contact_id: string | null }>(
      `select id, crm_contact_id from applications where signnow_document_id = $1 limit 1`,
      [document_id]
    );

    const app = appResult.rows[0];
    if (!app) {
      res.status(200).json({ received: true });
      return;
    }

    await dbQuery(
      `update applicants set ssn = null, sin = null, updated_at = now() where application_id = $1`,
      [app.id]
    );

    await dbQuery(
      `update application_partners set ssn = null, sin = null, updated_at = now() where application_id = $1`,
      [app.id]
    );

    if (app.crm_contact_id) {
      await logCrmEvent({
        contactId: app.crm_contact_id,
        applicationId: app.id,
        eventType: "signnow_signed",
        payload: { signerEmail: signer_email, documentId: document_id },
      });
    }

    await dbQuery(
      `insert into job_queue (id, type, payload, status, created_at)
       values (gen_random_uuid(), 'send_lender_package', $1::jsonb, 'pending', now())`,
      [JSON.stringify({ applicationId: app.id })]
    );

    res.status(200).json({ received: true, purged: true });
  })
);

export default router;

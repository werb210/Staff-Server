import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getInstrumentedClient } from "../db";
import { createApplication } from "../modules/applications/applications.repo";
import { getClientSubmissionOwnerUserId } from "../config";
import { upsertCrmLead } from "../modules/crm/leadUpsert.service";

const router = Router();

const createApplicationSchema = z.object({
  sessionId: z.string().uuid(),
  source: z.string().trim().optional(),
});

router.post("/", async (req, res) => {
  let client: Awaited<ReturnType<typeof getInstrumentedClient>> | null = null;
  try {
    const { sessionId, source } = createApplicationSchema.parse(req.body ?? {});

    client = await getInstrumentedClient();
    await client.query("begin");

    const session = await client.query<{
      id: string;
      crm_lead_id: string | null;
      converted_application_id: string | null;
      company_name: string;
      full_name: string;
      email: string;
      phone: string | null;
      industry: string | null;
      years_in_business: number | null;
      monthly_revenue: string | null;
      annual_revenue: string | null;
      ar_balance: string | null;
      collateral_available: boolean | null;
      expires_at: Date | null;
      is_active: boolean | null;
    }>(
      `select id, crm_lead_id, converted_application_id, company_name, full_name, email, phone, industry, years_in_business,
              monthly_revenue, annual_revenue, ar_balance, collateral_available, expires_at, is_active
       from readiness_sessions
       where id = $1
       limit 1
       for update`,
      [sessionId]
    );

    const readiness = session.rows[0];
    if (!readiness) {
      await client.query("rollback");
      res.status(404).json({ success: false, error: "readiness_session_not_found" });
      return;
    }


    if (!readiness.is_active || (readiness.expires_at && new Date(readiness.expires_at).getTime() <= Date.now())) {
      await client.query(
        `update readiness_sessions
         set is_active = false, status = 'expired', updated_at = now()
         where id = $1`,
        [readiness.id]
      ).catch(() => undefined);
      await client.query("rollback");
      res.status(410).json({ success: false, error: "readiness_session_expired" });
      return;
    }
    if (readiness.converted_application_id) {
      await client.query("commit");
      res.status(200).json({ success: true, applicationId: readiness.converted_application_id, reused: true });
      return;
    }

    const mapped = await client.query<{ application_id: string }>(
      `select application_id from readiness_application_mappings where readiness_session_id = $1 limit 1`,
      [sessionId]
    );

    const mappedApplicationId = mapped.rows[0]?.application_id;
    if (mappedApplicationId) {
      await client.query(
        `update readiness_sessions
         set converted_application_id = coalesce(converted_application_id, $2), is_active = false, status = 'converted', updated_at = now()
         where id = $1`,
        [readiness.id, mappedApplicationId]
      ).catch(async () => {
        await client?.query(
          `update readiness_sessions
           set converted_application_id = coalesce(converted_application_id, $2), is_active = false, updated_at = now()
           where id = $1`,
          [readiness.id, mappedApplicationId]
        );
      });
      await client.query("commit");
      res.status(200).json({ success: true, applicationId: mappedApplicationId, reused: true });
      return;
    }

    const created = await createApplication({
      ownerUserId: getClientSubmissionOwnerUserId(),
      name: readiness.company_name,
      metadata: {
        readinessSessionId: readiness.id,
        crmLeadId: readiness.crm_lead_id,
        readiness: {
          fullName: readiness.full_name,
          email: readiness.email,
          phone: readiness.phone,
          industry: readiness.industry,
          yearsInBusiness: readiness.years_in_business,
          monthlyRevenue: readiness.monthly_revenue,
          annualRevenue: readiness.annual_revenue,
          arBalance: readiness.ar_balance,
          collateralAvailable: readiness.collateral_available,
        },
      },
      productType: "standard",
      productCategory: "standard",
      source: source ?? "readiness_continuation",
      client,
    });

    await client.query(
      `insert into readiness_application_mappings (id, readiness_session_id, application_id)
       values ($1, $2, $3)`,
      [randomUUID(), readiness.id, created.id]
    ).catch(() => undefined);

    await upsertCrmLead({
      companyName: readiness.company_name,
      fullName: readiness.full_name,
      email: readiness.email,
      phone: readiness.phone ?? undefined,
      industry: readiness.industry ?? undefined,
      yearsInBusiness: readiness.years_in_business,
      monthlyRevenue: readiness.monthly_revenue,
      annualRevenue: readiness.annual_revenue,
      arBalance: readiness.ar_balance,
      collateralAvailable: readiness.collateral_available,
      source: source ?? "readiness_continuation",
      tags: ["application"],
      activityType: "application_submission",
      activityPayload: { applicationId: created.id, readinessSessionId: readiness.id },
    });


    await client.query(
      `update readiness_sessions
       set converted_application_id = $2, is_active = false, status = 'converted', updated_at = now()
       where id = $1`,
      [readiness.id, created.id]
    ).catch(async () => {
      await client?.query(
        `update readiness_sessions
         set converted_application_id = $2, is_active = false, updated_at = now()
         where id = $1`,
        [readiness.id, created.id]
      );
    });

    if (readiness.crm_lead_id) {
      await client.query(
        `update crm_leads
         set tags = (
               select to_jsonb(array(
                 select distinct value
                 from jsonb_array_elements_text(coalesce(crm_leads.tags, '[]'::jsonb) || '["application"]'::jsonb)
               ))
             )
         where id = $1`,
        [readiness.crm_lead_id]
      ).catch(() => undefined);

      await client.query(
        `update crm_leads
         set application_id = coalesce(application_id, $2::text)
         where id = $1`,
        [readiness.crm_lead_id, created.id]
      ).catch(() => undefined);
    }

    await client.query("commit");

    res.status(201).json({ success: true, applicationId: created.id, leadId: readiness.crm_lead_id, reused: false });
  } catch (error) {
    if (client) {
      await client.query("rollback").catch(() => undefined);
    }
    if (error instanceof Error && error.name === "ZodError") {
      res.status(400).json({ success: false, error: "invalid_payload" });
      return;
    }
    res.status(500).json({ success: false, error: "server_error", ...(process.env.NODE_ENV === "production" ? {} : { detail: error instanceof Error ? error.message : String(error) }) });
  } finally {
    client?.release();
  }
});

export default router;

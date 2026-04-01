import { Router } from "express";
import { dbQuery } from "../db";
import { requireFields } from "../middleware/validate";
import { LeadSchema } from "../validation";
import { fail, ok } from "../lib/response";

const router = Router();

type LeadPayload = {
  email?: string;
  phone?: string;
  productType?: string;
  businessName?: string;
  companyName?: string;
  requestedAmount?: number;
};

async function createLead(payload: LeadPayload): Promise<{ leadId?: string }> {
  const normalizedPayload = {
    ...payload,
    businessName: payload.businessName ?? payload.companyName,
  };

  const parsed = LeadSchema.safeParse(normalizedPayload ?? {});

  if (!parsed.success) {
    return {};
  }

  const data = parsed.data;
  const result = await dbQuery<{ id: string }>(
    `insert into crm_leads (email, phone, company_name, product_interest, requested_amount, source)
       values ($1, $2, $3, $4, $5, 'public_api')
       returning id`,
    [data.email, data.phone, data.businessName, data.productType, data.requestedAmount ?? null],
  );

  return { leadId: result.rows[0]?.id };
}

router.get("/test", (_req, res) => {
  return ok(res, { ok: true });
});

router.post(
  "/lead",
  requireFields(["companyName", "email"]),
  async (req, res, next) => {
    try {
      const result = await createLead(req.body);

      if (!result?.leadId) {
        return fail(res, 400, "INVALID_INPUT");
      }

      return ok(res, { leadId: result.leadId });
    } catch (error) {
      return next(error);
    }
  },
);

router.all("/lead", (_req, res) => {
  return fail(res, 405, "METHOD_NOT_ALLOWED");
});

export default router;

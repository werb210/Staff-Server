import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import { createOrUpdateCrmLead, listCrmLeads } from "../modules/crm/crm.service";

const router = Router();

const createLeadSchema = z.object({
  source: z.enum(["website", "client"]),
  stage: z.enum(["credit_readiness", "application_started"]),
  tags: z.array(z.string().trim().min(1)).optional().default([]),
  companyName: z.string().trim().optional(),
  fullName: z.string().trim().optional(),
  email: z.string().trim().email(),
  phone: z.string().trim().min(1),
  yearsInBusiness: z.union([z.string(), z.number()]).optional(),
  annualRevenue: z.union([z.string(), z.number()]).optional(),
  monthlyRevenue: z.union([z.string(), z.number()]).optional(),
  requestedAmount: z.union([z.string(), z.number()]).optional(),
  creditScoreRange: z.string().trim().optional(),
  productInterest: z.string().trim().optional(),
  industryInterest: z.string().trim().optional(),
  arBalance: z.union([z.string(), z.number()]).optional(),
  collateralAvailable: z.union([z.string(), z.boolean()]).optional(),
  notes: z.string().trim().optional(),
});

router.post("/", async (req, res) => {
  try {
    const parsed = createLeadSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        code: "validation_error",
        message: "Invalid lead payload.",
        details: parsed.error.flatten(),
      });
      return;
    }

    const payload = parsed.data;
    const lead = await createOrUpdateCrmLead({
      companyName: payload.companyName ?? "",
      fullName: payload.fullName ?? "",
      email: payload.email,
      phone: payload.phone,
      yearsInBusiness: payload.yearsInBusiness != null ? String(payload.yearsInBusiness) : undefined,
      annualRevenue: payload.annualRevenue != null ? String(payload.annualRevenue) : undefined,
      monthlyRevenue: payload.monthlyRevenue != null ? String(payload.monthlyRevenue) : undefined,
      requestedAmount: payload.requestedAmount != null ? String(payload.requestedAmount) : undefined,
      creditScoreRange: payload.creditScoreRange,
      productInterest: payload.productInterest,
      industryInterest: payload.industryInterest,
      arBalance: payload.arBalance != null ? String(payload.arBalance) : undefined,
      collateralAvailable: payload.collateralAvailable != null ? String(payload.collateralAvailable) : undefined,
      source: payload.source,
      notes: payload.notes,
      tags: [...payload.tags, payload.stage],
    });

    res.status(lead.created ? 201 : 200).json({ id: lead.id, created: lead.created });
  } catch (_err) {
    res.status(500).json({ code: "internal_error", message: "Failed to create lead" });
  }
});

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.CRM_READ]));

router.get("/", async (_req, res) => {
  try {
    const leads = await listCrmLeads();
    res.json(leads);
  } catch (_err) {
    res.status(500).json({ code: "internal_error", message: "Failed to fetch leads" });
  }
});

export default router;

import { type Request, type Response, Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { createLead, getLeads } from "./lead.service";

interface CreateLeadBody {
  source?: string;
  companyName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  yearsInBusiness?: string;
  annualRevenue?: string;
  monthlyRevenue?: string;
  requestedAmount?: string;
  creditScoreRange?: string;
  productInterest?: string;
  industryInterest?: string;
  notes?: string;
  tags?: unknown;
}

const router = Router();

router.post(
  "/",
  requireAuth,
  async (req: Request<{}, {}, CreateLeadBody>, res: Response, next) => {
    const source = typeof req.body?.source === "string" ? req.body.source.trim() : "";
    if (!source) {
      res.status(400).json({ message: "source is required" });
      return;
    }

    try {
      const lead = await createLead({
        source,
        companyName: req.body?.companyName,
        fullName: req.body?.fullName,
        email: req.body?.email,
        phone: req.body?.phone,
        yearsInBusiness: req.body?.yearsInBusiness,
        annualRevenue: req.body?.annualRevenue,
        monthlyRevenue: req.body?.monthlyRevenue,
        requestedAmount: req.body?.requestedAmount,
        creditScoreRange: req.body?.creditScoreRange,
        productInterest: req.body?.productInterest,
        industryInterest: req.body?.industryInterest,
        notes: req.body?.notes,
        tags: req.body?.tags,
      });

      res.status(201).json(lead);
    } catch (err) {
      next(err);
    }
  },
);

router.get("/", requireAuth, async (_req, res, next) => {
  try {
    const leads = await getLeads();
    res.json(leads);
  } catch (err) {
    next(err);
  }
});

export default router;

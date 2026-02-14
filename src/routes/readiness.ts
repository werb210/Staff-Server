import { type Request, type Response, Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { db } from "../db";
import {
  createReadinessLead,
  createReadinessLeadSchema,
} from "../modules/readiness/readiness.service";
import {
  createOrReuseReadinessSession,
  getActiveReadinessSessionByToken,
} from "../modules/readiness/readinessSession.service";
import { logError, logInfo } from "../observability/logger";

const router = Router();

const readinessLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "rate_limited", code: 429 },
  skip: () => process.env.NODE_ENV === "test",
});

const continueSchema = z.object({
  email: z.string().trim().email().max(254),
});

const readinessLookupParamsSchema = z.object({
  id: z.string().uuid(),
});

router.post("/", readinessLimiter, async (req, res) => {
  try {
    const parsed = createReadinessLeadSchema.parse(req.body ?? {});
    const readinessSession = await createOrReuseReadinessSession(parsed);

    logInfo("readiness_session_upserted", {
      sessionId: readinessSession.sessionId,
      readinessToken: readinessSession.token,
      reused: readinessSession.reused,
      crmLeadId: readinessSession.crmLeadId,
    });

    res.status(readinessSession.reused ? 200 : 201).json({
      success: true,
      data: {
        leadId: readinessSession.crmLeadId,
        sessionId: readinessSession.sessionId,
        readinessToken: readinessSession.token,
        reused: readinessSession.reused,
      },
    });
  } catch (error) {
    if (
      error instanceof Error
      && (error.message === "invalid_phone" || error.name === "ZodError")
    ) {
      res.status(400).json({ success: false, error: "Invalid payload" });
      return;
    }

    logError("readiness_create_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ success: false, error: "Server error" });
  }
});

const getReadinessSessionHandler = async (req: Request, res: Response) => {
  try {
    const { id } = readinessLookupParamsSchema.parse(req.params);
    const session = await getActiveReadinessSessionByToken(id);

    if (!session) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        email: session.email,
        phone: session.phone,
        timestamp: session.createdAt,
        score: null,
        intakeData: {
          kyc: {
            companyName: session.companyName,
            fullName: session.fullName,
            email: session.email,
            phone: session.phone,
            industry: session.industry,
          },
          financial: {
            yearsInBusiness: session.yearsInBusiness,
            monthlyRevenue: session.monthlyRevenue,
            annualRevenue: session.annualRevenue,
            arOutstanding: session.arOutstanding,
            existingDebt: session.existingDebt,
          },
        },
        kyc: {
          companyName: session.companyName,
          fullName: session.fullName,
          email: session.email,
          phone: session.phone,
          industry: session.industry,
        },
        financial: {
          yearsInBusiness: session.yearsInBusiness,
          monthlyRevenue: session.monthlyRevenue,
          annualRevenue: session.annualRevenue,
          arOutstanding: session.arOutstanding,
          existingDebt: session.existingDebt,
        },
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      res.status(400).json({ success: false, error: "Invalid session id" });
      return;
    }

    logError("readiness_get_by_token_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ success: false, error: "Server error" });
  }
};

router.get("/session/:id", readinessLimiter, getReadinessSessionHandler);
router.get("/:id", readinessLimiter, getReadinessSessionHandler);

router.post("/continue", readinessLimiter, async (req, res) => {
  try {
    const { email } = continueSchema.parse(req.body ?? {});

    const { rows } = await db.query(
      `select id, company_name, full_name, email, phone, industry,
              years_in_business, monthly_revenue, annual_revenue,
              ar_outstanding, existing_debt, created_at, used_in_application
       from continuation
       where lower(email) = lower($1)
       order by created_at desc
       limit 1`,
      [email]
    );

    const session = rows[0];
    if (!session) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }

    res.status(200).json({ success: true, data: { session } });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      res.status(400).json({ success: false, error: "Invalid payload" });
      return;
    }
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/readiness", readinessLimiter, async (req, res) => {
  try {
    const parsed = createReadinessLeadSchema.parse(req.body ?? {});

    await createReadinessLead({
      ...parsed,
      source: "website",
    });

    res.status(201).json({ success: true, data: { status: "stored" } });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      res.status(400).json({ success: false, error: "Invalid payload" });
      return;
    }
    logError("legacy_readiness_store_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;

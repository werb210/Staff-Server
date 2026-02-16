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
  getReadinessSessionByIdAndToken,
} from "../modules/readiness/readinessSession.service";
import { logError, logInfo } from "../observability/logger";
import { findCapitalReadinessBySession } from "../modules/readiness/creditReadiness.storage";

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
  sessionId: z.string().uuid(),
});

const submitReadinessHandler = async (req: Request, res: Response) => {
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
        score: readinessSession.score,
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
};

router.post("/", readinessLimiter, submitReadinessHandler);
router.post("/submit", readinessLimiter, submitReadinessHandler);

function formatReadinessSession(session: NonNullable<Awaited<ReturnType<typeof getActiveReadinessSessionByToken>>>) {
  return {
    sessionId: session.sessionId,
    email: session.email,
    phone: session.phone,
    timestamp: session.createdAt,
    score: session.score,
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
        arBalance: session.arBalance,
        collateralAvailable: session.collateralAvailable,
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
      arBalance: session.arBalance,
      collateralAvailable: session.collateralAvailable,
    },
    expiresAt: session.expiresAt,
  };
}

const getReadinessSessionHandler = async (req: Request, res: Response) => {
  try {
    const { sessionId } = readinessLookupParamsSchema.parse(req.params);
    const token = typeof req.query.token === "string" ? req.query.token.trim() : "";

    if (!token) {
      res.status(400).json({ success: false, error: "Missing token" });
      return;
    }

    const lookup = await getReadinessSessionByIdAndToken(sessionId, token);
    if (lookup.status === "not_found") {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    if (lookup.status === "invalid_token") {
      res.status(401).json({ success: false, error: "Invalid token" });
      return;
    }
    if (lookup.status === "expired") {
      res.status(410).json({ success: false, error: "Session expired" });
      return;
    }

    res.status(200).json({ success: true, data: formatReadinessSession(lookup.session) });
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

router.get("/session/:sessionId", readinessLimiter, getReadinessSessionHandler);

router.get("/:sessionId", readinessLimiter, async (req, res) => {
  try {
    const { sessionId } = readinessLookupParamsSchema.parse(req.params);
    const session = await getActiveReadinessSessionByToken(sessionId);

    if (!session) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }

    res.status(200).json({ success: true, data: formatReadinessSession(session) });
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
});


router.get("/bridge/:sessionToken", readinessLimiter, async (req, res) => {
  const sessionToken = req.params.sessionToken?.trim();
  if (!sessionToken) {
    return res.status(400).json({ error: "Session token is required" });
  }

  const lead = await findCapitalReadinessBySession(sessionToken);

  if (!lead) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json({
    step1: {
      industry: lead.industry,
      yearsInBusiness: lead.yearsInBusiness,
      annualRevenue: lead.annualRevenue,
      monthlyRevenue: lead.monthlyRevenue,
      arBalance: lead.arBalance,
      collateralAvailable: lead.collateralAvailable,
    },
    step3: {
      companyName: lead.companyName,
    },
    step4: {
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone,
    },
  });
});

router.post("/continue", readinessLimiter, async (req, res) => {
  try {
    const { email } = continueSchema.parse(req.body ?? {});

    const { rows } = await db.query(
      `select id, company_name, full_name, email, phone, industry,
              years_in_business, monthly_revenue, annual_revenue,
              ar_balance, collateral_available, created_at, used_in_application
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

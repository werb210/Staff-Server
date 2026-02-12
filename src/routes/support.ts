import { Router } from "express";
import { retry, withRetry } from "../utils/retry";
import { createSupportThread } from "../services/supportService";
import { dbQuery } from "../db";
import { getTwilioClient } from "../services/twilio";
import { pushLeadToCRM } from "../services/crmWebhook";
import { SupportController } from "../modules/support/support.controller";
import { logger } from "../utils/logger";

const router = Router();

router.post("/live", async (req, res) => {
  const { source, sessionId } = req.body as {
    source?: "website" | "client";
    sessionId?: string;
  };

  if (!source || !sessionId) {
    return res.status(400).json({ error: "Missing source or sessionId" });
  }

  await dbQuery(
    `insert into live_chat_requests (source, session_id, status)
     values ($1, $2, 'pending')`,
    [source, sessionId]
  );

  return res.json({ success: true });
});

router.get("/live", async (_req, res) => {
  const { rows } = await dbQuery(
    `select id, source, session_id, status, created_at
     from live_chat_requests
     where status = 'pending'
     order by created_at desc`
  );
  res.json(rows);
});

router.get("/live/count", async (_req, res) => {
  const { rows } = await dbQuery<{ count: string }>(
    `select count(*)::text as count
     from live_chat_requests
     where status = 'pending'`
  );
  res.json({ count: Number(rows[0]?.count ?? "0") });
});

router.post("/human", async (req, res) => {
  const { message, user } = req.body as {
    message?: string;
    user?: string;
  };

  await withRetry(async () => {
    await createSupportThread({
      type: "chat_escalation",
      description: message ?? "Human support request",
      source: user ?? "unknown",
    });
  });

  logger.info("human_chat_request", { message });
  res.json({ success: true });
});

router.post("/report", async (req, res) => {
  const { message, description, screenshot, route } = req.body as {
    message?: string;
    description?: string;
    screenshot?: string;
    route?: string;
  };

  const resolvedDescription = description ?? message;

  await dbQuery(
    `insert into issue_reports
      (description, screenshot_base64, user_agent)
     values ($1, $2, $3)`,
    [
      resolvedDescription ?? "Issue reported",
      screenshot ?? null,
      req.headers["user-agent"] ?? "",
    ]
  );

  await withRetry(async () => {
    await createSupportThread({
      type: "issue_report",
      ...(resolvedDescription ? { description: resolvedDescription } : {}),
      ...(screenshot ? { screenshotBase64: screenshot } : {}),
      ...(route ? { route } : {}),
    });
  });

  logger.info("issue_reported", { description: resolvedDescription ?? null });
  res.json({ success: true });
});

router.post("/contact", async (req, res) => {
  const { company, firstName, lastName, email, phone } = req.body as {
    company?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };

  if (!company || !firstName || !lastName || !email || !phone) {
    return res.status(400).json({ error: "Missing fields" });
  }

  await dbQuery(
    `insert into contact_leads (company, first_name, last_name, email, phone)
     values ($1, $2, $3, $4, $5)`,
    [company, firstName, lastName, email, phone]
  );

  const client = getTwilioClient();
  await retry(async () =>
    client.messages.create({
      body: `New Contact: ${company} - ${firstName} ${lastName} - ${phone}`,
      from: process.env.TWILIO_PHONE as string,
      to: "+15878881837",
    })
  );

  await pushLeadToCRM({
    type: "contact_form",
    company,
    firstName,
    lastName,
    email,
    phone,
  });

  return res.json({ success: true });
});

router.post("/track", async (req, res) => {
  const { event, metadata } = req.body as {
    event?: string;
    metadata?: Record<string, unknown>;
  };

  logger.info("support_track_event", { event: event ?? null, metadata: metadata ?? null });
  return res.json({ success: true });
});

router.post("/session", SupportController.createSession);
router.get("/queue", SupportController.getQueue);
router.post("/issue", SupportController.createIssue);
router.get("/issues", SupportController.getIssues);
router.post("/event", SupportController.trackEvent);
router.get("/events", SupportController.getEvents);

export default router;

import { randomUUID } from "node:crypto";
import { Router } from "express";
import Joi from "joi";
import { sanitizePlainText } from "../validation/public.validation";
import { dbQuery } from "../db";
import { contactRateLimiter } from "../middleware/rateLimiter";
import { successResponse, errorResponse } from "../middleware/response";
import { validateBody } from "../middleware/validate";
import { getTwilioClient } from "../services/twilio";
import { pushLeadToCRM } from "../services/crmWebhook";
import { sendSMS } from "../services/smsService";
import { createContinuation } from "../modules/continuation/continuation.service";
import { retry } from "../utils/retry";
import { withTimeout } from "../utils/withTimeout";
import { logger } from "../utils/logger";
import { upsertCrmLead } from "../modules/crm/leadUpsert.service";

const sanitizeString = (value: unknown, helpers: Joi.CustomHelpers) => {
  if (typeof value !== "string") {
    return value;
  }
  const sanitized = sanitizePlainText(value);
  if (!sanitized) {
    return helpers.error("string.empty");
  }
  return sanitized;
};

const schema = Joi.object({
  company: Joi.string().trim().min(2).max(120).custom(sanitizeString),
  companyName: Joi.string().trim().min(2).max(120).custom(sanitizeString),
  firstName: Joi.string().trim().min(2).max(80).custom(sanitizeString),
  lastName: Joi.string().trim().min(2).max(80).custom(sanitizeString),
  fullName: Joi.string().trim().min(2).max(120).custom(sanitizeString),
  email: Joi.string().trim().email().max(254).custom(sanitizeString).required(),
  phone: Joi.string().trim().max(32).pattern(/^\+?[0-9\s().-]{7,32}$/).custom(sanitizeString).required(),
  source: Joi.string().trim().max(64).custom(sanitizeString).default("website_contact"),
  utm: Joi.object().optional(),
}).custom((value, helpers) => {
  const company = value.company ?? value.companyName;
  const hasName = Boolean(value.fullName) || (Boolean(value.firstName) && Boolean(value.lastName));
  if (!company) {
    return helpers.error("any.invalid");
  }
  if (!hasName) {
    return helpers.error("any.invalid");
  }
  return value;
});

const router = Router();

const submitContactHandler = async (req: import("express").Request, res: import("express").Response) => {
  try {
    const {
      company,
      companyName,
      firstName,
      lastName,
      fullName,
      email,
      phone,
      source,
      utm,
    } = req.body as {
      company?: string;
      companyName?: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
      email: string;
      phone: string;
      source: string;
      utm?: Record<string, unknown>;
    };

    const resolvedCompany = company ?? companyName ?? "Unknown Company";
    const resolvedFullName = fullName ?? `${firstName ?? ""} ${lastName ?? ""}`.trim();
    const [resolvedFirstName, ...restName] = resolvedFullName.split(" ");
    const resolvedLastName = restName.join(" ") || "N/A";

    const existingContactLead = await dbQuery<{ id: string }>(
      `select id
       from contact_leads
       where lower(email) = lower($1)
          or regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = regexp_replace($2, '\\D', '', 'g')
       order by created_at desc
       limit 1`,
      [email, phone]
    );

    if (existingContactLead.rows.length === 0) {
      await dbQuery(
        `insert into contact_leads (company, first_name, last_name, email, phone)
         values ($1, $2, $3, $4, $5)`,
        [resolvedCompany, resolvedFirstName, resolvedLastName, email, phone]
      );
    }

    const existingCompany = await dbQuery<{ id: string }>(
      `select id
       from companies
       where lower(email) = lower($1)
          or regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = regexp_replace($2, '\\D', '', 'g')
       order by created_at asc nulls last
       limit 1`,
      [email, phone]
    );

    const companyId = existingCompany.rows[0]?.id ?? randomUUID();

    if (existingCompany.rows[0]) {
      await dbQuery(
        `update companies
         set name = coalesce($2, name),
             email = coalesce($3, email),
             phone = coalesce($4, phone)
         where id = $1`,
        [companyId, resolvedCompany, email, phone]
      );
    } else {
      await dbQuery(
        `insert into companies (id, name, email, phone, status)
         values ($1, $2, $3, $4, 'prospect')`,
        [companyId, resolvedCompany, email, phone]
      );
    }

    const existingContact = await dbQuery<{ id: string }>(
      `select id
       from contacts
       where lower(email) = lower($1)
          or regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = regexp_replace($2, '\\D', '', 'g')
       order by created_at asc nulls last
       limit 1`,
      [email, phone]
    );

    const contactId = existingContact.rows[0]?.id ?? randomUUID();

    if (existingContact.rows[0]) {
      await dbQuery(
        `update contacts
         set company_id = coalesce($2, company_id),
             name = coalesce($3, name),
             email = coalesce($4, email),
             phone = coalesce($5, phone),
             status = coalesce($6, status)
         where id = $1`,
        [contactId, companyId, resolvedFullName, email, phone, source || "website_contact"]
      );
    } else {
      await dbQuery(
        `insert into contacts (id, company_id, name, email, phone, status)
         values ($1, $2, $3, $4, $5, $6)`,
        [contactId, companyId, resolvedFullName, email, phone, source || "website_contact"]
      );
    }

    const client = getTwilioClient();

    if (client?.messages?.create) {
      await withTimeout(
        retry(async () =>
          client.messages.create({
            body: `Lead type: contact_form | Name: ${resolvedFullName} | Phone: ${phone} | Company: ${resolvedCompany} | Email: ${email}`,
            from: (process.env.TWILIO_NUMBER || process.env.TWILIO_PHONE || "+14155550000") as string,
            to: "+15878881837",
          })
        )
      ).catch((error) => {
        logger.warn("contact_sms_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    } else {
      logger.warn("contact_sms_skipped", { reason: "twilio_client_unavailable" });
    }

    await withTimeout(pushLeadToCRM({
      type: "contact_form",
      company: resolvedCompany,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      email,
      phone,
      source,
      utm: utm ?? null,
    })).catch((error) => {
      logger.warn("contact_crm_webhook_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    });

    const crmLead = await upsertCrmLead({
      companyName: resolvedCompany,
      fullName: resolvedFullName,
      email,
      phone,
      source: source || "website_contact",
      tags: ["contact_form"],
      activityType: "contact_form_submission",
      activityPayload: { utm: utm ?? null },
    });

    try {
      await dbQuery(
        `insert into communications_messages (id, type, direction, status, contact_id, body, created_at)
         values ($1, 'sms', 'outbound', 'queued', $2, $3, now())`,
        [randomUUID(), contactId, `Contact form submitted by ${resolvedFullName} (${email}, ${phone})`]
      );
    } catch (error) {
      logger.warn("communications_log_insert_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    let token = "";
    try {
      token = await createContinuation({
        companyName: resolvedCompany,
        fullName: resolvedFullName,
        email,
        phone,
      }, crmLead.id);
    } catch (error) {
      logger.warn("contact_continuation_create_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (process.env.INTAKE_SMS_NUMBER) {
      await sendSMS(process.env.INTAKE_SMS_NUMBER, `Lead type: contact_form | Name: ${resolvedFullName} | Phone: ${phone} | Company: ${resolvedCompany}`);
    }

    logger.info("contact_request", { company: resolvedCompany, email, phone, source, utm: utm ?? null, deduped: existingContactLead.rows.length > 0 });
        const redirect = token
      ? `https://client.boreal.financial/apply?continue=${token}`
      : "https://client.boreal.financial/apply";
    return successResponse(res, { redirect }, "contact submitted");
  } catch (err) {
    logger.error("contact_error", { err });
    return errorResponse(res, 500, "could_not_submit_contact");
  }
};

router.post("/", contactRateLimiter, validateBody(schema), submitContactHandler);
router.post("/submit", contactRateLimiter, validateBody(schema), submitContactHandler);

export default router;

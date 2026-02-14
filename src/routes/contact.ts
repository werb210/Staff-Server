import { randomUUID } from "node:crypto";
import { Router } from "express";
import Joi from "joi";
import { dbQuery } from "../db";
import { contactRateLimiter } from "../middleware/rateLimiter";
import { successResponse, errorResponse } from "../middleware/response";
import { validateBody } from "../middleware/validate";
import { getTwilioClient } from "../services/twilio";
import { pushLeadToCRM } from "../services/crmWebhook";
import { createCRMLead } from "../services/crmService";
import { sendSMS } from "../services/smsService";
import { createContinuation } from "../modules/continuation/continuation.service";
import { retry } from "../utils/retry";
import { withTimeout } from "../utils/withTimeout";
import { logger } from "../utils/logger";

const schema = Joi.object({
  company: Joi.string().trim().min(2),
  companyName: Joi.string().trim().min(2),
  firstName: Joi.string().trim().min(2),
  lastName: Joi.string().trim().min(2),
  fullName: Joi.string().trim().min(2),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[0-9+]*$/).required(),
  source: Joi.string().trim().default("website_contact"),
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

router.post("/", contactRateLimiter, validateBody(schema), async (req, res) => {
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

    const client = getTwilioClient();

    await withTimeout(
      retry(async () =>
        client.messages.create({
          body: `New website contact:\n${resolvedCompany}\n${resolvedFullName}\n${email}\n${phone}`,
          from: (process.env.TWILIO_NUMBER || process.env.TWILIO_PHONE) as string,
          to: "+15878881837",
        })
      )
    );

    const companyId = randomUUID();
    const contactId = randomUUID();

    await dbQuery(
      `insert into contact_leads (company, first_name, last_name, email, phone)
       values ($1, $2, $3, $4, $5)`,
      [resolvedCompany, resolvedFirstName, resolvedLastName, email, phone]
    );

    await dbQuery(
      `insert into companies (id, name, email, phone, status)
       values ($1, $2, $3, $4, 'prospect')`,
      [companyId, resolvedCompany, email, phone]
    );

    await dbQuery(
      `insert into contacts (id, company_id, name, email, phone, status)
       values ($1, $2, $3, $4, $5, $6)`,
      [contactId, companyId, resolvedFullName, email, phone, source || "website_contact"]
    );


    await withTimeout(pushLeadToCRM({
      type: "contact_form",
      company: resolvedCompany,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      email,
      phone,
      source,
      utm: utm ?? null,
    }));
    const crmLead = await createCRMLead({
      companyName: resolvedCompany,
      fullName: resolvedFullName,
      email,
      phone,
      source: source || "website_contact",
      metadata: { utm: utm ?? null },
    });

    const token = await createContinuation({
      companyName: resolvedCompany,
      fullName: resolvedFullName,
      email,
      phone,
    }, crmLead.id);

    if (process.env.INTAKE_SMS_NUMBER) {
      await sendSMS(process.env.INTAKE_SMS_NUMBER, `New Website Contact: ${resolvedCompany}`);
    }

    logger.info("contact_request", { company: resolvedCompany, email, phone, source, utm: utm ?? null });
    return successResponse(res, { redirect: `https://client.boreal.financial/apply?continue=${token}` }, "contact submitted");
  } catch (err) {
    logger.error("contact_error", { err });
    return errorResponse(res, 500, "could_not_submit_contact");
  }
});

export default router;

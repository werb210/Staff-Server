import { randomUUID } from "node:crypto";
import { Router } from "express";
import Joi from "joi";
import { dbQuery } from "../db";
import { contactRateLimiter } from "../middleware/rateLimiter";
import { successResponse, errorResponse } from "../middleware/response";
import { validateBody } from "../middleware/validate";
import { getTwilioClient } from "../services/twilio";
import { pushLeadToCRM } from "../services/crmWebhook";

const schema = Joi.object({
  company: Joi.string().trim().min(2).required(),
  firstName: Joi.string().trim().min(2).required(),
  lastName: Joi.string().trim().min(2).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[0-9+]*$/).required(),
  source: Joi.string().trim().default("website_contact"),
  utm: Joi.object().optional(),
});

const router = Router();

router.post("/", contactRateLimiter, validateBody(schema), async (req, res) => {
  try {
    const { company, firstName, lastName, email, phone, source, utm } = req.body as {
      company: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      source: string;
      utm?: Record<string, unknown>;
    };

    const client = getTwilioClient();

    await client.messages.create({
      body: `New Contact:\nCompany: ${company}\nName: ${firstName} ${lastName}\nEmail: ${email}\nPhone: ${phone}`,
      from: process.env.TWILIO_PHONE as string,
      to: "+15878881837",
    });

    const companyId = randomUUID();
    const contactId = randomUUID();

    await dbQuery(
      `insert into companies (id, name, email, phone, status)
       values ($1, $2, $3, $4, 'prospect')`,
      [companyId, company, email, phone]
    );

    await dbQuery(
      `insert into contacts (id, company_id, name, email, phone, status)
       values ($1, $2, $3, $4, $5, $6)`,
      [contactId, companyId, `${firstName} ${lastName}`, email, phone, source || "website_contact"]
    );


    await pushLeadToCRM({
      type: "contact_form",
      company,
      firstName,
      lastName,
      email,
      phone,
      source,
      utm: utm ?? null,
    });
    console.log("Contact Request:", { company, email, phone, source, utm });
    return successResponse(res, {}, "contact submitted");
  } catch (err) {
    console.error("Contact Error:", err);
    return errorResponse(res, 500, "could_not_submit_contact");
  }
});

export default router;

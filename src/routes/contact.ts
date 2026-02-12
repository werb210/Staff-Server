import { Router } from "express";
import Joi from "joi";
import twilio from "twilio";
import { contactRateLimiter } from "../middleware/rateLimiter";
import { validateBody } from "../middleware/validate";
import { successResponse, errorResponse } from "../middleware/response";

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

    console.log("Contact Request:", { company, email, phone, source });

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID as string,
      process.env.TWILIO_AUTH_TOKEN as string
    );

    await client.messages.create({
      body: `New Lead:\nCompany: ${company}\nName: ${firstName} ${lastName}\nEmail: ${email}\nPhone: ${phone}\nSource: ${source}\nUTM:${JSON.stringify(utm)}`,
      from: process.env.TWILIO_PHONE as string,
      to: "+15878881837",
    });

    return successResponse(res, {}, "contact submitted");
  } catch (err) {
    console.error("Contact Error:", err);
    return errorResponse(res, 500, "could_not_submit_contact");
  }
});

export default router;

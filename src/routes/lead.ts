import { Router } from "express";
import Joi from "joi";
import { validateBody } from "../middleware/validate";
import { successResponse, errorResponse } from "../middleware/response";

const schema = Joi.object({
  revenue: Joi.number().min(0).required(),
  industry: Joi.string().trim().required(),
  years: Joi.number().min(0).required(),
  amount: Joi.number().min(0).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[0-9+]*$/).required(),
  utm: Joi.object().optional(),
});

const router = Router();

router.post("/", validateBody(schema), async (req, res) => {
  try {
    const { revenue, industry, years, amount, email, phone, utm } = req.body as {
      revenue: number;
      industry: string;
      years: number;
      amount: number;
      email: string;
      phone: string;
      utm?: Record<string, unknown>;
    };

    const score = Math.min(100, Math.round(revenue / 10000 + years * 10));

    console.log("Lead Stored:", { revenue, industry, years, amount, email, phone, utm });

    return successResponse(res, { score }, "lead evaluated");
  } catch (err) {
    console.error("Lead Error:", err);
    return errorResponse(res, 500, "could_not_process_lead");
  }
});

export default router;

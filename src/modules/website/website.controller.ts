import { Request, Response } from "express";
import { createCrmLead } from "../crm/crm.service";
import { sendSms } from "../notifications/sms.service";

export async function submitCreditReadiness(req: Request, res: Response) {
  try {
    const {
      companyName,
      fullName,
      phone,
      email,
      industry,
      yearsInBusiness,
      monthlyRevenue,
      annualRevenue,
      requestedAmount,
      creditScoreRange,
      productInterest,
      industryInterest,
      arOutstanding,
      existingDebt,
    } = req.body as Record<string, string | undefined>;

    if (!companyName || !fullName || !phone || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const lead = await createCrmLead({
      companyName,
      fullName,
      phone,
      email,
      industry,
      yearsInBusiness,
      monthlyRevenue,
      annualRevenue,
      requestedAmount,
      creditScoreRange,
      productInterest,
      industryInterest,
      arOutstanding,
      existingDebt,
      source: "website_credit_readiness",
      tags: ["credit_readiness"],
    });

    await sendSms({
      to: "+15878881837",
      message: `New Credit Readiness Lead:\n${companyName}\n${fullName}\n${phone}\n${email}`,
    });

    return res.json({ success: true, leadId: lead.id });
  } catch (err) {
    console.error("Credit readiness error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

import { Request, Response } from "express";
import { createCrmLead } from "../crm/crm.service";
import { sendSms } from "../notifications/sms.service";

export async function submitContactForm(req: Request, res: Response) {
  try {
    const { companyName, fullName, phone, email, message, productInterest, industryInterest } = req.body as Record<
      string,
      string | undefined
    >;

    if (!companyName || !fullName || !phone || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const lead = await createCrmLead({
      companyName,
      fullName,
      phone,
      email,
      notes: message,
      productInterest,
      industryInterest,
      source: "website_contact",
      tags: ["contact_form"],
    });

    await sendSms({
      to: "+15878881837",
      message: `New Website Contact:\n${companyName}\n${fullName}\n${phone}\n${email}`,
    });

    return res.json({ success: true, leadId: lead.id });
  } catch (err) {
    console.error("Contact form error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

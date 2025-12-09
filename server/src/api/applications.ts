import { Router } from "express";
import { db } from "../db/client";
import {
  applications,
  companies,
  contacts,
  deals,
  lenderProducts,
} from "../db/schema";
import { authenticate } from "../middleware/authMiddleware";
import { eq } from "drizzle-orm";

const router = Router();

router.use(authenticate);

router.get("/", async (_req, res, next) => {
  try {
    const list = await db.select().from(applications).orderBy(applications.createdAt);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { company, contact, deal, lenderProductId, kycAnswers, productSelections, applicantProfile, businessProfile, requestedAmount } = req.body;

    let companyId = company?.id as string | undefined;
    if (!companyId) {
      const [createdCompany] = await db.insert(companies).values({
        name: company?.name ?? "New Company",
        industry: company?.industry,
        website: company?.website,
      }).returning({ id: companies.id });
      companyId = createdCompany.id;
    }

    let contactId = contact?.id as string | undefined;
    if (!contactId && contact) {
      const [createdContact] = await db
        .insert(contacts)
        .values({
          companyId,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          title: contact.title,
        })
        .returning({ id: contacts.id });
      contactId = createdContact.id;
    }

    let dealId = deal?.id as string | undefined;
    if (!dealId && deal) {
      const [createdDeal] = await db
        .insert(deals)
        .values({ companyId, name: deal.name ?? `Deal for ${company?.name ?? "company"}`, value: deal.value })
        .returning({ id: deals.id });
      dealId = createdDeal.id;
    }

    const [application] = await db
      .insert(applications)
      .values({
        companyId,
        contactId,
        dealId,
        lenderProductId,
        kycAnswers: kycAnswers ?? {},
        productSelections: productSelections ?? {},
        applicantProfile: applicantProfile ?? {},
        businessProfile: businessProfile ?? {},
        requestedAmount,
      })
      .returning();

    res.status(201).json(application);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/step", async (req, res, next) => {
  try {
    const step = Number(req.body.step);
    if (!Number.isInteger(step) || step < 1) {
      return res.status(400).json({ error: "step must be a positive integer" });
    }
    const [updated] = await db
      .update(applications)
      .set({ currentStep: step, updatedAt: new Date() })
      .where(eq(applications.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Application not found" });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;

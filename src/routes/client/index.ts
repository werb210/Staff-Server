import { Router } from "express";
import continuationRouter from "./continuation.js";
import documentsRouter from "./documents.js";
import applicationsRouter from "./applications.js";
import lendersRouter from "./lenders.js";
import lenderProductsRouter from "./lenderProducts.js";
import clientSubmissionRoutes from "../../modules/clientSubmission/clientSubmission.routes.js";
import sessionRouter from "./session.js";
import {
  clientDocumentsRateLimit,
  clientReadRateLimit,
} from "../../middleware/rateLimit.js";
import { safeHandler } from "../../middleware/safeHandler.js";
import { dbQuery } from "../../db.js";

const router = Router();
const clientReadLimiter = clientReadRateLimit() as any;

router.use((req: any, res: any, next: any) => {
  if (req.method === "GET") {
    clientReadLimiter(req, res, next);
    return;
  }
  next();
});

router.use("/", continuationRouter);
router.use("/", applicationsRouter);
router.use("/lenders", lendersRouter);
router.use("/", lenderProductsRouter);
router.use("/", clientSubmissionRoutes);
router.use("/", sessionRouter);
router.use("/documents", clientDocumentsRateLimit(), documentsRouter);

router.get(
  "/readiness-prefill",
  safeHandler(async (req: any, res: any) => {
    const phone = typeof req.query.phone === "string" ? req.query.phone.trim() : null;
    const token = typeof req.query.token === "string" ? req.query.token.trim() : null;

    if (!phone && !token) {
      res.status(400).json({ error: "phone_or_token_required" });
      return;
    }

    let row: Record<string, any> | undefined;
    if (token) {
      const result = await dbQuery(
        `select * from readiness_sessions where id = $1 and is_active = true limit 1`,
        [token]
      );
      row = result.rows[0];
    } else {
      const result = await dbQuery(
        `select * from readiness_sessions where phone = $1 and is_active = true order by created_at desc limit 1`,
        [phone]
      );
      row = result.rows[0];
    }

    if (!row) {
      res.status(200).json({ found: false });
      return;
    }

    res.status(200).json({
      found: true,
      prefill: {
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        yearsInBusiness: row.years_in_business,
        annualRevenue: row.annual_revenue,
        profitable: row.existing_debt,
        score: row.score ?? null,
      },
    });
  })
);

export default router;

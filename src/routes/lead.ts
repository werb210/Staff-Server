import { Router } from "express";
import { LeadSchema } from "../schemas";
import { validate } from "../middleware/validate";
import { ok } from "../lib/response";

const router = Router();

router.post("/lead", validate(LeadSchema), (req, res) => {
  const lead = req.validated;
  return ok(res, lead);
});

export default router;

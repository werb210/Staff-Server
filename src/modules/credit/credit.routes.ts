import { Router } from "express";
import { submitCreditReadiness } from "./credit.controller";

const router = Router();

router.post("/credit-readiness", submitCreditReadiness);

export default router;

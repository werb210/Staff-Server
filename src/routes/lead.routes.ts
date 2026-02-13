import { Router } from "express";
import { createLead, getLeads } from "../controllers/lead.controller";

const router = Router();

router.post("/crm/lead", createLead);
router.get("/crm/lead", getLeads);

export default router;

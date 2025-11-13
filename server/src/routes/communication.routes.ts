import { Router } from "express";

import {
  getSMSThreads,
  getSMSForContact,
  sendSMS,
  getCalls,
  initiateCall,
  endCall,
  getEmailThreads,
  sendEmail,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../controllers/communicationController.js";

const router = Router();

/* -------------------- SMS -------------------- */
router.get("/sms/threads", getSMSThreads);
router.get("/sms/thread/:contactId", getSMSForContact);
router.post("/sms/send", sendSMS);

/* -------------------- Calls -------------------- */
router.get("/calls", getCalls);
router.post("/calls/initiate", initiateCall);
router.post("/calls/end", endCall);

/* -------------------- Email -------------------- */
router.get("/email/threads", getEmailThreads);
router.post("/email/send", sendEmail);

/* -------------------- Templates -------------------- */
router.get("/templates", getTemplates);
router.post("/templates", createTemplate);
router.put("/templates/:id", updateTemplate);
router.delete("/templates/:id", deleteTemplate);

export default router;

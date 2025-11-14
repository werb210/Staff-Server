// routes/communication.js
// -----------------------------------------------------
// Communication Center Routes
// /api/:silo/communication/*
// -----------------------------------------------------

import { Router } from "express";
import {
  getSmsThreads,
  getSmsThreadById,
  sendSmsMessage,

  getCallLogs,
  initiateCall,

  getEmailThreads,
  getEmailThreadById,
  sendEmailMessage,

  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../controllers/communicationController.js";

const router = Router({ mergeParams: true });

// Express 5-safe async wrapper
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// -----------------------------------------------------
// SMS Routes
// -----------------------------------------------------
router.get("/sms", wrap(getSmsThreads));
router.get("/sms/:threadId", wrap(getSmsThreadById));
router.post("/sms/:threadId/send", wrap(sendSmsMessage));

// -----------------------------------------------------
// Calls
// -----------------------------------------------------
router.get("/calls", wrap(getCallLogs));
router.post("/calls/initiate", wrap(initiateCall));

// -----------------------------------------------------
// Email Routes
// -----------------------------------------------------
router.get("/email", wrap(getEmailThreads));
router.get("/email/:threadId", wrap(getEmailThreadById));
router.post("/email/:threadId/send", wrap(sendEmailMessage));

// -----------------------------------------------------
// Templates
// -----------------------------------------------------
router.get("/templates", wrap(getTemplates));
router.post("/templates", wrap(createTemplate));
router.put("/templates/:templateId", wrap(updateTemplate));
router.delete("/templates/:templateId", wrap(deleteTemplate));

export default router;

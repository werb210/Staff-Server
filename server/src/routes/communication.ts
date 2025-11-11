import { Router } from "express";
import { CallLogSchema, EmailPayloadSchema, SmsPayloadSchema } from "../schemas/communicationSchemas.js";
import { communicationService } from "../services/communicationService.js";
import { logInfo } from "../utils/logger.js";
import { parseWithSchema } from "../utils/validation.js";

const router = Router();

router.get("/", (_req, res, next) => {
  try {
    logInfo("GET /api/communication");
    const communications = communicationService.listCommunications();
    res.json({ message: "OK", data: communications });
  } catch (error) {
    next(error);
  }
});

router.post("/sms", (req, res, next) => {
  try {
    logInfo("POST /api/communication/sms", req.body);
    const payload = parseWithSchema(SmsPayloadSchema, req.body);
    const record = communicationService.sendSms(payload);
    res.status(201).json({ message: "OK", data: record });
  } catch (error) {
    next(error);
  }
});

router.post("/email", (req, res, next) => {
  try {
    logInfo("POST /api/communication/email", req.body);
    const payload = parseWithSchema(EmailPayloadSchema, req.body);
    const record = communicationService.sendEmail(payload);
    res.status(201).json({ message: "OK", data: record });
  } catch (error) {
    next(error);
  }
});

router.post("/calls", (req, res, next) => {
  try {
    logInfo("POST /api/communication/calls", req.body);
    const payload = parseWithSchema(CallLogSchema, req.body);
    const record = communicationService.logCall(payload);
    res.status(201).json({ message: "OK", data: record });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", (req, res) => {
  logInfo("PUT /api/communication/:id", { id: req.params.id });
  res.json({ message: "OK", notice: "Updates are not required for communication records" });
});

router.delete("/:id", (req, res, next) => {
  try {
    logInfo("DELETE /api/communication/:id", { id: req.params.id });
    const removed = communicationService.deleteCommunication(req.params.id);
    res.json({ message: "OK", removed });
  } catch (error) {
    next(error);
  }
});

export default router;

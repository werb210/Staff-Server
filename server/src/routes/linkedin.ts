import { Router } from "express";
import { CreateLinkedInSequenceSchema, LinkedInSequenceSchema } from "../schemas/linkedinSchemas.js";
import { linkedinService } from "../services/linkedinService.js";
import { logInfo } from "../utils/logger.js";
import { parseWithSchema } from "../utils/validation.js";

const router = Router();

router.get("/", (_req, res, next) => {
  try {
    logInfo("GET /api/linkedin");
    const sequences = linkedinService.listSequences();
    res.json({ message: "OK", data: sequences });
  } catch (error) {
    next(error);
  }
});

router.post("/", (req, res, next) => {
  try {
    logInfo("POST /api/linkedin", req.body);
    const payload = parseWithSchema(CreateLinkedInSequenceSchema, req.body);
    const sequence = linkedinService.createSequence(payload);
    res.status(201).json({ message: "OK", data: sequence });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", (req, res, next) => {
  try {
    logInfo("PUT /api/linkedin/:id", { id: req.params.id, body: req.body });
    const payload = parseWithSchema(LinkedInSequenceSchema.partial({ id: true }), req.body);
    const sequence = linkedinService.updateSequence(req.params.id, payload);
    res.json({ message: "OK", data: sequence });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", (req, res, next) => {
  try {
    logInfo("DELETE /api/linkedin/:id", { id: req.params.id });
    const removed = linkedinService.deleteSequence(req.params.id);
    res.json({ message: "OK", removed });
  } catch (error) {
    next(error);
  }
});

export default router;

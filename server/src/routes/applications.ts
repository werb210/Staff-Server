import { Router } from "express";
import {
  ApplicationCompleteSchema,
  ApplicationCreateSchema,
  ApplicationQuerySchema,
  ApplicationSubmitSchema,
  ApplicationUpdateSchema,
} from "../schemas/applicationSchemas.js";
import { applicationsService } from "../services/applicationsService.js";
import { logInfo } from "../utils/logger.js";
import { parseWithSchema } from "../utils/validation.js";

const router = Router();

router.get("/", (req, res, next) => {
  try {
    logInfo("GET /api/applications", req.query);
    const query = parseWithSchema(ApplicationQuerySchema, req.query);
    const applications = applicationsService.listApplications(query.status);
    res.json({ message: "OK", data: applications });
  } catch (error) {
    next(error);
  }
});

router.post("/", (req, res, next) => {
  try {
    logInfo("POST /api/applications", req.body);
    const payload = parseWithSchema(ApplicationCreateSchema, req.body);
    const application = applicationsService.createApplication(payload);
    res.status(201).json({ message: "OK", data: application });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", (req, res, next) => {
  try {
    logInfo("PUT /api/applications/:id", { id: req.params.id, body: req.body });
    const payload = parseWithSchema(ApplicationUpdateSchema, req.body);
    const application = applicationsService.updateApplication(req.params.id, payload);
    res.json({ message: "OK", data: application });
  } catch (error) {
    next(error);
  }
});

router.put("/:id/submit", (req, res, next) => {
  try {
    logInfo("PUT /api/applications/:id/submit", { id: req.params.id, body: req.body });
    const payload = parseWithSchema(ApplicationSubmitSchema, { ...req.body, id: req.params.id });
    const application = applicationsService.submitApplication(payload.id, payload.submittedBy);
    res.json({ message: "OK", data: application });
  } catch (error) {
    next(error);
  }
});

router.put("/:id/complete", (req, res, next) => {
  try {
    logInfo("PUT /api/applications/:id/complete", { id: req.params.id, body: req.body });
    const payload = parseWithSchema(ApplicationCompleteSchema, { ...req.body, id: req.params.id });
    const application = applicationsService.completeApplication(payload.id, payload.completedBy);
    res.json({ message: "OK", data: application });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", (req, res, next) => {
  try {
    logInfo("DELETE /api/applications/:id", { id: req.params.id });
    const removed = applicationsService.deleteApplication(req.params.id);
    res.json({ message: "OK", removed });
  } catch (error) {
    next(error);
  }
});

export default router;

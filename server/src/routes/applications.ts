import { Router } from "express";
import { applicationService } from "../services/applicationService.js";
import {
  ApplicationAssignmentSchema,
  ApplicationCreateSchema,
  ApplicationPublishSchema,
  ApplicationStatusUpdateSchema,
  ApplicationUpdateSchema,
} from "../schemas/application.schema.js";
import { logError, logInfo } from "../utils/logger.js";

const router = Router();

/**
 * GET /api/applications
 * Example: curl "http://localhost:5000/api/applications?view=public"
 */
router.get("/", (req, res) => {
  try {
    const view = req.query.view;
    logInfo("Fetching applications", { view });
    const applications =
      view === "public"
        ? applicationService.listPublicApplications()
        : applicationService.listApplications();
    res.json({ message: "OK", data: applications });
  } catch (error) {
    logError("Failed to list applications", error);
    res.status(400).json({ message: "Unable to fetch applications" });
  }
});

/**
 * GET /api/applications/:id
 * Example: curl http://localhost:5000/api/applications/<id>
 */
router.get("/:id", (req, res) => {
  try {
    logInfo("Fetching application", { id: req.params.id });
    const application = applicationService.getApplication(req.params.id);
    res.json({ message: "OK", data: application });
  } catch (error) {
    logError("Failed to fetch application", error);
    res.status(400).json({ message: "Unable to fetch application" });
  }
});

/**
 * POST /api/applications
 * Example: curl -X POST http://localhost:5000/api/applications \
 *   -H 'Content-Type: application/json' \
 *   -d '{"applicantName":"Jane","applicantEmail":"jane@example.com","productId":"<uuid>","loanAmount":50000,"loanPurpose":"Expansion"}'
 */
router.post("/", (req, res) => {
  try {
    const payload = ApplicationCreateSchema.parse(req.body);
    logInfo("Creating application", { applicant: payload.applicantName });
    const created = applicationService.createApplication(payload);
    res.status(201).json({ message: "OK", data: created });
  } catch (error) {
    logError("Failed to create application", error);
    res.status(400).json({ message: "Invalid application payload" });
  }
});

/**
 * PUT /api/applications/:id
 * Example: curl -X PUT http://localhost:5000/api/applications/<id> \
 *   -H 'Content-Type: application/json' -d '{"loanPurpose":"Updated"}'
 */
router.put("/:id", (req, res) => {
  try {
    const payload = ApplicationUpdateSchema.parse({ id: req.params.id, ...req.body });
    if (Object.keys(payload).length <= 1) {
      throw new Error("No updates provided");
    }
    logInfo("Updating application", payload);
    const { id, ...updates } = payload;
    const updated = applicationService.updateApplication(id, updates);
    res.json({ message: "OK", data: updated });
  } catch (error) {
    logError("Failed to update application", error);
    res.status(400).json({
      message: error instanceof Error ? error.message : "Unable to update application",
    });
  }
});

/**
 * DELETE /api/applications/:id
 * Example: curl -X DELETE http://localhost:5000/api/applications/<id>
 */
router.delete("/:id", (req, res) => {
  try {
    logInfo("Deleting application", { id: req.params.id });
    const removed = applicationService.deleteApplication(req.params.id);
    res.json({ message: "OK", data: removed });
  } catch (error) {
    logError("Failed to delete application", error);
    res.status(400).json({ message: "Unable to delete application" });
  }
});

/**
 * POST /api/applications/:id/status
 * Example: curl -X POST http://localhost:5000/api/applications/<id>/status \
 *   -H 'Content-Type: application/json' -d '{"status":"review"}'
 */
router.post("/:id/status", (req, res) => {
  try {
    const payload = ApplicationStatusUpdateSchema.parse({
      id: req.params.id,
      status: req.body.status,
    });
    logInfo("Updating application status", payload);
    const updated = applicationService.updateStatus(payload.id, payload.status);
    res.json({ message: "OK", data: updated });
  } catch (error) {
    logError("Failed to update application status", error);
    res.status(400).json({ message: "Unable to update status" });
  }
});

/**
 * POST /api/applications/:id/assign
 * Example: curl -X POST http://localhost:5000/api/applications/<id>/assign \
 *   -H 'Content-Type: application/json' -d '{"assignedTo":"underwriter@example.com","stage":"review"}'
 */
router.post("/:id/assign", (req, res) => {
  try {
    const payload = ApplicationAssignmentSchema.parse({
      id: req.params.id,
      assignedTo: req.body.assignedTo,
      stage: req.body.stage,
    });
    logInfo("Assigning application", payload);
    const updated = applicationService.assignApplication(
      payload.id,
      payload.assignedTo,
      payload.stage,
    );
    res.json({ message: "OK", data: updated });
  } catch (error) {
    logError("Failed to assign application", error);
    res.status(400).json({ message: "Unable to assign application" });
  }
});

/**
 * POST /api/applications/:id/publish
 * Example: curl -X POST http://localhost:5000/api/applications/<id>/publish \
 *   -H 'Content-Type: application/json' -d '{"publishedBy":"ops"}'
 */
router.post("/:id/publish", (req, res) => {
  try {
    const payload = ApplicationPublishSchema.parse({
      id: req.params.id,
      publishedBy: req.body.publishedBy,
    });
    logInfo("Publishing application", payload);
    const published = applicationService.publishApplication(
      payload.id,
      payload.publishedBy,
    );
    res.json({ message: "OK", data: published });
  } catch (error) {
    logError("Failed to publish application", error);
    res.status(400).json({ message: "Unable to publish application" });
  }
});

export default router;

import { Router } from "express";
import { applicationService } from "../services/applicationService.js";
import {
  ApplicationCreateSchema,
  ApplicationPublishSchema,
  ApplicationStatusUpdateSchema,
} from "../schemas/application.schema.js";
import { logError, logInfo } from "../utils/logger.js";

const router = Router();

// Lists every application currently tracked by the service.
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

// Fetches a single application by identifier.
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

// Creates a new application after validating the input payload.
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

// Updates the status of an existing application.
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

// Publishes an application to the public list.
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

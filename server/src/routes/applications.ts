import { Router } from "express";
import { createApplicationSchema } from "../schemas/application.schema.js";
import type { CreateApplicationInput } from "../schemas/application.schema.js";
import { applicationService } from "../services/applicationService.js";
import { logInfo } from "../utils/logger.js";

/**
 * Router responsible for /api/applications endpoints.
 * Only the POST handler is required for the current stub implementation.
 */
const applicationsRouter = Router();

/**
 * POST /api/applications
 * Validates the payload and delegates to the application service. A simple
 * success JSON payload is returned so clients can confirm the route works.
 */
applicationsRouter.post("/", (req, res) => {
  logInfo("POST /api/applications invoked");

  const parsedPayload = createApplicationSchema.safeParse(req.body);
  if (!parsedPayload.success) {
    res.status(400).json({
      message: "Invalid application payload",
      issues: parsedPayload.error.flatten().fieldErrors
    });
    return;
  }

  const application: CreateApplicationInput = parsedPayload.data;
  const createdApplication = applicationService.createApplication(application);

  res.status(201).json({
    message: "Application created",
    application: createdApplication
  });
});

export default applicationsRouter;

import { Router } from "express";
import {
  ClientPortalQuerySchema,
  ClientPortalSignInSchema,
} from "../../schemas/publicLogin.schema.js";
import { ApplicationPortalNotFoundError } from "../../services/applicationService.js";
import { isPlaceholderSilo, respondWithPlaceholder } from "../../utils/placeholder.js";

const router = Router();

router.post("/sign-in", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }

  const parsed = ClientPortalSignInSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid sign-in request", issues: parsed.error.format() });
  }

  try {
    const session = req.silo!.services.applications.createClientPortalSession({
      ...parsed.data,
      silo: req.silo!.silo,
    });
    return res.json({ message: "OK", data: session });
  } catch (error) {
    if (error instanceof ApplicationPortalNotFoundError) {
      return res.status(404).json({ message: error.message });
    }
    throw error;
  }
});

router.get("/portal", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }

  const parsed = ClientPortalQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid portal query", issues: parsed.error.format() });
  }

  try {
    const session = req.silo!.services.applications.getClientPortalSession(
      parsed.data.applicationId,
      req.silo!.silo,
    );
    return res.json({ message: "OK", data: session });
  } catch (error) {
    if (error instanceof ApplicationPortalNotFoundError) {
      return res.status(404).json({ message: error.message });
    }
    throw error;
  }
});

export default router;

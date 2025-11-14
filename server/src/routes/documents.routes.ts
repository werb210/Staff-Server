import { Router } from "express";

const documentsRouter = Router();

/**
 * Documents root for a silo-scoped user.
 */
documentsRouter.get("/", (req, res) => {
  res.json({
    ok: true,
    route: "documents root",
    silo: req.silo ?? null,
    userId: req.user?.id ?? null,
  });
});

const applicationDocumentsRouter = Router();

/**
 * Simple placeholder endpoint for application scoped documents.
 */
applicationDocumentsRouter.get("/:applicationId/documents", (req, res) => {
  res.json({
    ok: true,
    route: "application documents",
    applicationId: req.params.applicationId,
    silo: req.silo ?? null,
  });
});

export default documentsRouter;
export { applicationDocumentsRouter };

import { Router } from "express";
import { parseApplication } from "../schemas/applicationSchema.js";
import { parseDocument } from "../schemas/documentSchema.js";
import { logInfo } from "../utils/logger.js";
import { listApplicationDocuments } from "../services/documentService.js";
import { recommendLenders } from "../services/lenderRecommendationService.js";

const applicationsRouter = Router();

applicationsRouter.get("/", (_req, res) => {
  logInfo("GET /api/applications invoked");
  res.json({ message: "List applications not implemented" });
});

applicationsRouter.post("/", (req, res) => {
  logInfo("POST /api/applications invoked");
  try {
    const application = parseApplication(req.body);
    res.status(201).json({ message: "Application created", application });
  } catch (error) {
    res.status(400).json({ message: "Invalid application payload", error: (error as Error).message });
  }
});

applicationsRouter.get("/:id/documents", async (req, res) => {
  logInfo("GET /api/applications/:id/documents invoked");
  const documents = await listApplicationDocuments(req.params.id);
  res.json({ message: "Application documents fetched", documents: documents.map(parseDocument) });
});

applicationsRouter.get("/:id/lenders", async (req, res) => {
  logInfo("GET /api/applications/:id/lenders invoked");
  const application = parseApplication({
    id: req.params.id,
    applicantId: "USR-001",
    amountRequested: 10000,
    termMonths: 24,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  const lenders = await recommendLenders({
    id: application.id,
    applicant: {
      id: "USR-001",
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      phone: "+10000000000",
      role: "applicant",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    amountRequested: application.amountRequested,
    termMonths: application.termMonths,
    status: application.status,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    documents: []
  });
  res.json({ message: "Recommended lenders fetched", lenders });
});

export default applicationsRouter;

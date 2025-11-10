import crypto from "node:crypto";
import { Router } from "express";
import { applicationSummarySchema, createApplicationSchema } from "../schemas/application.schema.js";
import type { ApplicationSummary, CreateApplicationInput } from "../schemas/application.schema.js";
import { parseDocument } from "../schemas/documentSchema.js";
import { logInfo } from "../utils/logger.js";
import {
  type DocumentRecord,
  listApplicationDocuments
} from "../services/documentService.js";
import { recommendLenders } from "../services/lenderRecommendationService.js";
import type { Application } from "../types/application.js";
import type { DocumentRequirement } from "../types/documentRequirement.js";
import type { User } from "../types/user.js";

const applicationsRouter = Router();

interface StoredApplication extends Application {
  purpose: string;
  collateral?: string;
}

const applicationStore = new Map<string, StoredApplication>();

function toApplicationSummary(application: StoredApplication): ApplicationSummary {
  return applicationSummarySchema.parse({
    id: application.id,
    applicant: {
      id: application.applicant.id,
      firstName: application.applicant.firstName,
      lastName: application.applicant.lastName,
      email: application.applicant.email,
      phone: application.applicant.phone
    },
    loanDetails: {
      amountRequested: application.amountRequested,
      termMonths: application.termMonths,
      purpose: application.purpose,
      collateral: application.collateral
    },
    status: application.status,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt
  });
}

function buildUserFromPayload(payload: CreateApplicationInput["applicant"], timestamp: string): User {
  return {
    id: payload.id,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone,
    role: "applicant",
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function buildDocumentRequirements(documents: DocumentRecord[]): DocumentRequirement[] {
  if (documents.length === 0) {
    return [];
  }
  return documents.map((document) => ({
    id: document.id,
    name: document.name,
    description: document.description,
    required: document.required,
    status: document.status
  }));
}

function mergeWithFallbackDocuments(
  serviceDocuments: DocumentRecord[],
  storedApplication: StoredApplication
): DocumentRecord[] {
  if (serviceDocuments.length > 0) {
    return serviceDocuments;
  }
  return storedApplication.documents.map((document) => ({
    id: document.id,
    applicationId: storedApplication.id,
    name: document.name,
    type: "other" as const,
    status: document.status,
    uploadedAt: storedApplication.updatedAt,
    description: document.description,
    required: document.required,
    checksum: "n/a",
    mimeType: "application/octet-stream",
    url: "",
    storageKey: "",
    size: 0,
    lastUpdatedAt: storedApplication.updatedAt
  }));
}

function seedApplications(): void {
  if (applicationStore.size > 0) {
    return;
  }
  const seededAt = new Date();
  const seededApplication: StoredApplication = {
    id: "APP-1001",
    applicant: {
      id: crypto.randomUUID(),
      firstName: "Jamie",
      lastName: "Rivera",
      email: "jamie.rivera@example.com",
      phone: "+15550101234",
      role: "applicant",
      createdAt: seededAt.toISOString(),
      updatedAt: seededAt.toISOString()
    },
    amountRequested: 85000,
    termMonths: 48,
    status: "submitted",
    createdAt: seededAt.toISOString(),
    updatedAt: seededAt.toISOString(),
    documents: [
      {
        id: "DOC-1001",
        name: "Business Plan",
        description: "Initial business plan provided by the applicant",
        required: true,
        status: "received"
      }
    ],
    purpose: "Expansion capital for second retail location",
    collateral: "Inventory and equipment"
  };
  applicationStore.set(seededApplication.id, seededApplication);
}

seedApplications();

/**
 * Handles GET /api/applications by returning the list of known applications.
 */
applicationsRouter.get("/", (_req, res) => {
  logInfo("GET /api/applications invoked");
  const applications = Array.from(applicationStore.values()).map((application) => toApplicationSummary(application));
  res.json({ applications });
});

/**
 * Handles POST /api/applications by validating and creating a new application record.
 */
applicationsRouter.post("/", (req, res) => {
  logInfo("POST /api/applications invoked");
  try {
    const payload = createApplicationSchema.parse(req.body);
    const now = new Date().toISOString();
    const applicationId = crypto.randomUUID();
    const applicant = buildUserFromPayload(payload.applicant, now);
    const storedApplication: StoredApplication = {
      id: applicationId,
      applicant,
      amountRequested: payload.loanDetails.amountRequested,
      termMonths: payload.loanDetails.termMonths,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      documents: payload.documents.map((document) => ({
        id: crypto.randomUUID(),
        name: document.name,
        description: `Provided during application submission (${document.type})`,
        required: true,
        status: "received"
      })),
      purpose: payload.loanDetails.purpose,
      collateral: payload.loanDetails.collateral
    };
    applicationStore.set(applicationId, storedApplication);
    const summary = toApplicationSummary(storedApplication);
    res.status(201).json({ application: summary });
  } catch (error) {
    res.status(400).json({ message: "Invalid application payload", error: (error as Error).message });
  }
});

/**
 * Handles GET /api/applications/:id/documents by returning associated documents.
 */
applicationsRouter.get("/:id/documents", async (req, res) => {
  logInfo("GET /api/applications/:id/documents invoked");
  const application = applicationStore.get(req.params.id);
  if (!application) {
    res.status(404).json({ message: "Application not found" });
    return;
  }
  const serviceDocuments = await listApplicationDocuments(application.id);
  const documents = mergeWithFallbackDocuments(serviceDocuments, application);
  const sanitizedDocuments = documents.map((document) => ({
    ...parseDocument(document),
    description: document.description,
    required: document.required,
    checksum: document.checksum,
    mimeType: document.mimeType,
    url: document.url,
    storageKey: document.storageKey,
    size: document.size,
    lastUpdatedAt: document.lastUpdatedAt
  }));
  if (serviceDocuments.length > 0) {
    application.documents = buildDocumentRequirements(serviceDocuments);
  }
  res.json({ documents: sanitizedDocuments });
});

/**
 * Handles GET /api/applications/:id/lenders by returning recommended lenders.
 */
applicationsRouter.get("/:id/lenders", async (req, res) => {
  logInfo("GET /api/applications/:id/lenders invoked");
  const storedApplication = applicationStore.get(req.params.id);
  if (!storedApplication) {
    res.status(404).json({ message: "Application not found" });
    return;
  }
  const serviceDocuments = await listApplicationDocuments(storedApplication.id);
  if (serviceDocuments.length > 0) {
    storedApplication.documents = buildDocumentRequirements(serviceDocuments);
  }
  const lenders = await recommendLenders({ ...storedApplication, documents: storedApplication.documents });
  res.json({ lenders });
});

export default applicationsRouter;

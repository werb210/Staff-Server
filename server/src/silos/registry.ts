import {
  ApplicationService,
  createApplicationService,
} from "../services/applicationService.js";
import { createAiService } from "../services/aiService.js";
import { createDocumentService } from "../services/documentService.js";
import { createLenderService } from "../services/lenderService.js";
import { createPipelineService } from "../services/pipelineService.js";
import { createEmailService } from "../services/emailService.js";
import { createTwilioService } from "../services/twilioService.js";
import { createMarketingService } from "../services/marketingService.js";
import { createBackupService } from "../services/backupService.js";
import { createRetryQueueService } from "../services/retryQueueService.js";
import { createOcrService } from "../services/ocrService.js";
import { createTaskService } from "../services/taskService.js";
import { createUserService } from "../services/userService.js";
import { PasskeyAuthService } from "../auth/passkeyAuthService.js";
import { PlaceholderAuthService } from "../auth/placeholderAuthService.js";
import { createContactsService } from "../services/contactsService.js";
import type { SiloContext, SiloKey } from "./types.js";

const commonUsers = {
  BF: [
    {
      userId: "bf-ops-1",
      email: "olivia.ops@bf.example",
      credentialId: "bf-cred-1",
      publicKey: "bf-public-key",
      scopes: ["read", "write", "admin"],
    },
  ],
  SLF: [
    {
      userId: "slf-ops-1",
      email: "sam.ops@slf.example",
      credentialId: "slf-cred-1",
      publicKey: "slf-public-key",
      scopes: ["read", "write"],
    },
  ],
} as const;

function createBFContext(): SiloContext {
  const ai = createAiService();
  const ocr = createOcrService();
  const applications = createApplicationService({ ai });
  const documents = createDocumentService({ ai, ocr });
  const lenders = createLenderService({ applicationService: applications, ai });
  const pipeline = createPipelineService({ applications });
  const emails = createEmailService();
  const communications = createTwilioService();
  const marketing = createMarketingService();
  const backups = createBackupService();
  const retryQueue = createRetryQueueService();
  const tasks = createTaskService([
    { id: "bf-task-1", name: "Review underwriting checklist", dueAt: new Date().toISOString(), status: "in-progress" },
    { id: "bf-task-2", name: "Prepare closing documents", dueAt: new Date(Date.now() + 3600 * 1000).toISOString(), status: "pending" },
  ]);
  const contacts = createContactsService([
    {
      id: "bf-contact-1",
      firstName: "Ava",
      lastName: "Moore",
      email: "ava.moore@bf.example",
      phone: "+15555551234",
      companyName: "Aurora Manufacturing",
      createdAt: "2024-05-01T10:00:00.000Z",
      updatedAt: "2024-05-10T16:30:00.000Z",
      timeline: [
        { id: "bf-contact-1-event-1", type: "call", message: "Completed onboarding call with borrower.", createdAt: "2024-05-02T14:30:00.000Z" },
        { id: "bf-contact-1-event-2", type: "email", message: "Sent checklist of required financial statements.", createdAt: "2024-05-06T18:15:00.000Z" },
      ],
    },
  ]);
  const users = createUserService([
    { id: "bf-user-1", name: "Olivia Operations", email: "olivia.ops@bf.example", role: "manager" },
    { id: "bf-user-2", name: "Mason Analyst", email: "mason.analyst@bf.example", role: "agent" },
  ]);

  const auth = new PasskeyAuthService({
    silo: "BF",
    secret: "bf-secret",
    users: commonUsers.BF,
  });

  return {
    silo: "BF",
    services: {
      ai,
      ocr,
      applications,
      documents,
      lenders,
      pipeline,
      emails,
      sms: communications,
      calls: communications,
      marketing,
      backups,
      retryQueue,
      tasks,
      users,
      contacts,
      metadata: { silo: "BF", documentStatusDefault: "review" },
    },
    auth,
  };
}

function createSLFContext(): SiloContext {
  const ai = createAiService();
  const ocr = createOcrService();
  const applications = createApplicationService({ ai });
  const documents = createDocumentService({ ai, ocr });
  const lenders = createLenderService({ applicationService: applications, ai });
  const pipeline = createPipelineService({ applications });
  const emails = createEmailService();
  const communications = createTwilioService();
  const marketing = createMarketingService();
  const backups = createBackupService();
  const retryQueue = createRetryQueueService();
  const tasks = createTaskService([{ id: "slf-task-1", name: "Contact borrower", dueAt: new Date().toISOString(), status: "pending" }]);
  const contacts = createContactsService([
    {
      id: "slf-contact-1",
      firstName: "Maya",
      lastName: "Singh",
      email: "maya.singh@slf.example",
      phone: "+15555559876",
      companyName: "Brightline Studios",
      createdAt: "2024-03-11T12:20:00.000Z",
      updatedAt: "2024-04-02T09:10:00.000Z",
      timeline: [
        { id: "slf-contact-1-event-1", type: "email", message: "Shared updated financial package with underwriting team.", createdAt: "2024-03-15T17:45:00.000Z" },
        { id: "slf-contact-1-event-2", type: "system", message: "Automated credit pull completed.", createdAt: "2024-03-18T08:00:00.000Z" },
      ],
    },
  ]);
  const users = createUserService([{ id: "slf-user-1", name: "Sam Lending", email: "sam.ops@slf.example", role: "manager" }]);

  const auth = new PasskeyAuthService({ silo: "SLF", secret: "slf-secret", users: commonUsers.SLF });

  return {
    silo: "SLF",
    services: {
      ai,
      ocr,
      applications,
      documents,
      lenders,
      pipeline,
      emails,
      sms: communications,
      calls: communications,
      marketing,
      backups,
      retryQueue,
      tasks,
      users,
      contacts,
      metadata: { silo: "SLF", documentStatusDefault: "processing" },
    },
    auth,
  };
}

function createBIContext(): SiloContext {
  const placeholderAuth = new PlaceholderAuthService("BI");
  const ai = createAiService();
  const ocr = createOcrService();
  const applications = new ApplicationService();
  const documents = createDocumentService({ ai, ocr });
  const lenders = createLenderService({ applicationService: applications, ai });
  const pipeline = createPipelineService({ applications });
  const emails = createEmailService();
  const communications = createTwilioService();
  const marketing = createMarketingService();
  const backups = createBackupService();
  const retryQueue = createRetryQueueService();
  const tasks = createTaskService();
  const users = createUserService();
  const contacts = createContactsService();

  return {
    silo: "BI",
    services: {
      ai,
      ocr,
      applications,
      documents,
      lenders,
      pipeline,
      emails,
      sms: communications,
      calls: communications,
      marketing,
      backups,
      retryQueue,
      tasks,
      users,
      contacts,
      metadata: { silo: "BI", documentStatusDefault: "processing" },
    },
    auth: placeholderAuth,
  };
}

export const registry: Record<SiloKey, SiloContext> = {
  BF: createBFContext(),
  SLF: createSLFContext(),
  BI: createBIContext(),
};

export const resolveSilo = (silo: SiloKey): SiloContext => registry[silo];

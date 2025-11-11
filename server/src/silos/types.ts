import type { ApplicationServiceType } from "../services/applicationService.js";
import type { DocumentServiceType } from "../services/documentService.js";
import type { LenderServiceType } from "../services/lenderService.js";
import type { PipelineServiceType } from "../services/pipelineService.js";
import type { EmailServiceType } from "../services/emailService.js";
import type { TwilioServiceType } from "../services/twilioService.js";
import type { MarketingServiceType } from "../services/marketingService.js";
import type { BackupServiceType } from "../services/backupService.js";
import type { RetryQueueServiceType } from "../services/retryQueueService.js";
import type { DocumentStatus } from "../schemas/document.schema.js";
import type { AiServiceType } from "../services/aiService.js";
import type { OcrServiceType } from "../services/ocrService.js";
import type { TaskService } from "../services/taskService.js";
import type { UserService } from "../services/userService.js";

export type SiloKey = "BF" | "SLF" | "BI";

export interface AuthSession {
  userId: string;
  email: string;
  silo: SiloKey;
  issuedAt: string;
  token: string;
  scopes: string[];
}

export interface PasskeyAssertionInput {
  credentialId: string;
  challenge: string;
  signature: string;
}

export interface AuthService {
  ensureAuthenticated(headers: Record<string, string | string[] | undefined>): AuthSession;
  loginWithPasskey(assertion: PasskeyAssertionInput): AuthSession;
  describe(): { mode: "passkey" | "placeholder"; message: string };
}

export interface SiloServices {
  ai: AiServiceType;
  ocr: OcrServiceType;
  applications: ApplicationServiceType;
  documents: DocumentServiceType;
  lenders: LenderServiceType;
  pipeline: PipelineServiceType;
  emails: EmailServiceType;
  sms: TwilioServiceType;
  calls: TwilioServiceType;
  marketing: MarketingServiceType;
  backups: BackupServiceType;
  retryQueue: RetryQueueServiceType;
  tasks: TaskService;
  users: UserService;
  metadata: {
    silo: SiloKey;
    documentStatusDefault: DocumentStatus;
  };
}

export interface SiloContext {
  silo: SiloKey;
  services: SiloServices;
  auth: AuthService;
}

import { AppError } from "../../middleware/errors";
import { recordAuditEvent } from "../audit/audit.service";
import { getOcrMaxAttempts, getOcrProvider } from "../../config";
import {
  findApplicationById,
  findDocumentById,
  findActiveDocumentVersion,
  listDocumentsByApplicationId,
} from "../applications/applications.repo";
import {
  createOcrJob,
  findOcrJobByDocumentId,
  findOcrResultByDocumentId,
  markOcrJobFailure,
  markOcrJobSuccess,
  resetOcrJob,
} from "./ocr.repo";
import { createOpenAiOcrProvider, type OcrProvider } from "./ocr.provider";
import { createOcrStorage, OcrStorageValidationError, type OcrStorage } from "./ocr.storage";
import { type OcrJobRecord } from "./ocr.types";
import { logError } from "../../observability/logger";
import { refreshOcrInsightsForApplication } from "../../ocr/insights";

const OCR_RETRY_BASE_MS = 1000;
const OCR_RETRY_MAX_MS = 15 * 60 * 1000;

function resolveProvider(): OcrProvider {
  const provider = getOcrProvider();
  if (provider === "openai") {
    return createOpenAiOcrProvider();
  }
  throw new Error(`unsupported_ocr_provider:${provider}`);
}

function parseMetadata(metadata: unknown): { mimeType: string; fileName?: string } {
  if (!metadata || typeof metadata !== "object") {
    throw new Error("missing_document_metadata");
  }
  const record = metadata as { mimeType?: unknown; fileName?: unknown };
  if (!record.mimeType || typeof record.mimeType !== "string") {
    throw new Error("missing_document_mime_type");
  }
  return {
    mimeType: record.mimeType,
    fileName: typeof record.fileName === "string" ? record.fileName : undefined,
  };
}

function computeNextAttempt(attemptCount: number, maxAttempts: number): Date | null {
  const nextAttempt = attemptCount + 1;
  if (nextAttempt >= maxAttempts) {
    return null;
  }
  const delay = Math.min(OCR_RETRY_BASE_MS * 2 ** attemptCount, OCR_RETRY_MAX_MS);
  return new Date(Date.now() + delay);
}

export async function enqueueOcrForDocument(documentId: string): Promise<OcrJobRecord> {
  const document = await findDocumentById(documentId);
  if (!document) {
    throw new AppError("not_found", "Document not found.", 404);
  }
  return createOcrJob({
    documentId: document.id,
    applicationId: document.application_id,
    maxAttempts: getOcrMaxAttempts(),
  });
}

export async function enqueueOcrForApplication(applicationId: string): Promise<OcrJobRecord[]> {
  const application = await findApplicationById(applicationId);
  if (!application) {
    throw new AppError("not_found", "Application not found.", 404);
  }
  const documents = await listDocumentsByApplicationId(applicationId);
  const jobs: OcrJobRecord[] = [];
  for (const document of documents) {
    const job = await createOcrJob({
      documentId: document.id,
      applicationId: document.application_id,
      maxAttempts: getOcrMaxAttempts(),
    });
    jobs.push(job);
  }
  return jobs;
}

export async function getOcrJobStatus(documentId: string): Promise<OcrJobRecord | null> {
  return findOcrJobByDocumentId(documentId);
}

export async function getOcrResult(documentId: string): Promise<ReturnType<typeof findOcrResultByDocumentId>> {
  return findOcrResultByDocumentId(documentId);
}

export async function retryOcrJob(documentId: string): Promise<OcrJobRecord> {
  const job = await findOcrJobByDocumentId(documentId);
  if (!job) {
    return enqueueOcrForDocument(documentId);
  }
  const updated = await resetOcrJob({ jobId: job.id });
  if (!updated) {
    throw new AppError("not_found", "OCR job not found.", 404);
  }
  return updated;
}

export async function processOcrJob(
  job: OcrJobRecord,
  options?: { provider?: OcrProvider; storage?: OcrStorage }
): Promise<void> {
  const provider = options?.provider ?? resolveProvider();
  const storage = options?.storage ?? createOcrStorage();
  const maxAttempts = Number.isFinite(job.max_attempts) && job.max_attempts > 0
    ? job.max_attempts
    : getOcrMaxAttempts();

  try {
    const document = await findDocumentById(job.document_id);
    if (!document) {
      throw new Error("document_not_found");
    }
    const version = await findActiveDocumentVersion({ documentId: document.id });
    if (!version) {
      throw new Error("document_version_missing");
    }
    const { mimeType, fileName } = parseMetadata(version.metadata);
    const buffer = await storage.getBuffer({ content: version.content });
    const result = await provider.extract({ buffer, mimeType, fileName });
    await markOcrJobSuccess({
      jobId: job.id,
      documentId: job.document_id,
      provider: result.provider,
      model: result.model,
      extractedText: result.text,
      extractedJson: result.json,
      meta: result.meta,
    });
    try {
      await refreshOcrInsightsForApplication({
        applicationId: job.application_id,
        actorUserId: null,
        source: "ocr_update",
      });
    } catch (insightError) {
      logError("ocr_insights_refresh_failed", {
        code: "ocr_insights_refresh_failed",
        applicationId: job.application_id,
        error: insightError instanceof Error ? insightError.message : "unknown_error",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    if (error instanceof OcrStorageValidationError) {
      logError("ocr_storage_url_rejected", {
        code: "ocr_storage_url_rejected",
        jobId: job.id,
        documentId: job.document_id,
        url: error.url,
      });
      try {
        await recordAuditEvent({
          action: "ocr_storage_url_rejected",
          actorUserId: null,
          targetUserId: null,
          targetType: "ocr_job",
          targetId: job.id,
          success: false,
        });
      } catch (auditError) {
        logError("ocr_storage_url_audit_failed", {
          code: "ocr_storage_url_audit_failed",
          jobId: job.id,
          error: auditError instanceof Error ? auditError.message : "unknown_error",
        });
      }
    }
    const attemptCount = job.attempt_count + 1;
    const status = attemptCount >= maxAttempts ? "canceled" : "failed";
    const nextAttemptAt =
      status === "canceled" ? null : computeNextAttempt(job.attempt_count, maxAttempts);
    await markOcrJobFailure({
      jobId: job.id,
      attemptCount,
      status,
      lastError: message,
      nextAttemptAt,
      maxAttempts,
    });
  }
}

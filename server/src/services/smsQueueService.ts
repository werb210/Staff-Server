// =============================================================================
// server/src/services/smsQueueService.ts
// Drizzle-backed SMS queue implemented via audit log records
// =============================================================================

import auditLogsRepo from "../db/repositories/auditLogs.repo.js";
import { smsService } from "./smsService.js";

const EVENT_TYPE = "sms-queue";

type SmsJobDetails = {
  to: string;
  body: string;
  status: string;
  applicationId: string | null;
  contactId: string | null;
  providerMessageId?: string | null;
  sentAt?: Date | null;
  error?: string | null;
  attempts?: number;
};

const mapRecord = (record: any) => {
  if (!record || record.eventType !== EVENT_TYPE) return null;
  const details = (record.details ?? {}) as SmsJobDetails;
  return {
    id: record.id,
    ...details,
    createdAt: record.createdAt,
  };
};

const smsQueueService = {
  /**
   * Queue a message for async delivery.
   */
  async enqueue(to: string, body: string, applicationId?: string, contactId?: string) {
    const created = await auditLogsRepo.create({
      eventType: EVENT_TYPE,
      details: {
        to,
        body,
        status: "queued",
        applicationId: applicationId ?? null,
        contactId: contactId ?? null,
        attempts: 0,
      },
    });

    return mapRecord(created);
  },

  /**
   * Pull the next queued SMS job (FIFO)
   */
  async getNextQueued() {
    const records = await auditLogsRepo.findMany({ eventType: EVENT_TYPE } as any);
    const queued = (await records)
      .map(mapRecord)
      .filter((r) => r && r.status === "queued")
      .sort((a, b) => new Date((a as any).createdAt).getTime() - new Date((b as any).createdAt).getTime());

    return queued[0] ?? null;
  },

  /**
   * Mark item as "processing"
   */
  async markProcessing(id: string) {
    const existing = await auditLogsRepo.findById(id);
    const details = (existing?.details ?? {}) as SmsJobDetails;
    return mapRecord(
      await auditLogsRepo.update(id, {
        details: { ...details, status: "processing" },
      }),
    );
  },

  /**
   * Mark item as complete
   */
  async markSent(id: string, providerMessageId: string) {
    const existing = await auditLogsRepo.findById(id);
    const details = (existing?.details ?? {}) as SmsJobDetails;
    return mapRecord(
      await auditLogsRepo.update(id, {
        details: {
          ...details,
          status: "sent",
          providerMessageId,
          sentAt: new Date(),
        },
      }),
    );
  },

  /**
   * Mark item as failed (for retry later)
   */
  async markFailed(id: string, error: string) {
    const existing = await auditLogsRepo.findById(id);
    const details = (existing?.details ?? {}) as SmsJobDetails;
    const attempts = (details.attempts ?? 0) + 1;
    return mapRecord(
      await auditLogsRepo.update(id, {
        details: {
          ...details,
          status: "failed",
          error,
          attempts,
        },
      }),
    );
  },

  /**
   * Worker: process SMS queue
   */
  async processQueue() {
    const job = await this.getNextQueued();
    if (!job) return null;

    await this.markProcessing(job.id);

    try {
      const response = await smsService.send(job.to, job.body);
      await this.markSent(job.id, response.sid);
      return { ok: true, id: job.id };
    } catch (err: any) {
      await this.markFailed(job.id, err?.message ?? "Unknown error");
      return { ok: false, id: job.id, error: err?.message };
    }
  },

  /**
   * View all failed jobs for dashboard
   */
  async getFailedJobs(limit = 50) {
    const records = await auditLogsRepo.findMany({ eventType: EVENT_TYPE } as any);
    const failed = (await records)
      .map(mapRecord)
      .filter((r) => r && r.status === "failed")
      .sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime());

    return failed.slice(0, limit);
  },

  /**
   * Retry a single failed job manually
   */
  async retry(id: string) {
    const existing = await auditLogsRepo.findById(id);
    const details = (existing?.details ?? {}) as SmsJobDetails;
    return mapRecord(
      await auditLogsRepo.update(id, {
        details: { ...details, status: "queued", error: null },
      }),
    );
  },
};

export default smsQueueService;

// =============================================================================
// END OF FILE
// =============================================================================

// =============================================================================
// server/src/services/smsQueueService.ts
// BLOCK 26 — Prisma rewrite for SMS queue + Twilio delivery tracking
// =============================================================================

import db from "../db/index";
import { smsService } from "./smsService";

const smsQueueService = {
  /**
   * Queue a message for async delivery.
   */
  async enqueue(to: string, body: string, applicationId?: string, contactId?: string) {
    return db.smsQueue.create({
      data: {
        to,
        body,
        status: "queued",
        applicationId: applicationId ?? null,
        contactId: contactId ?? null,
      },
    });
  },

  /**
   * Pull the next queued SMS job (FIFO)
   */
  async getNextQueued() {
    return db.smsQueue.findFirst({
      where: { status: "queued" },
      orderBy: { createdAt: "asc" },
    });
  },

  /**
   * Mark item as "processing"
   */
  async markProcessing(id: string) {
    return db.smsQueue.update({
      where: { id },
      data: { status: "processing" },
    });
  },

  /**
   * Mark item as complete
   */
  async markSent(id: string, providerMessageId: string) {
    return db.smsQueue.update({
      where: { id },
      data: {
        status: "sent",
        providerMessageId,
        sentAt: new Date(),
      },
    });
  },

  /**
   * Mark item as failed (for retry later)
   */
  async markFailed(id: string, error: string) {
    return db.smsQueue.update({
      where: { id },
      data: {
        status: "failed",
        error,
        attempts: { increment: 1 },
      },
    });
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
    return db.smsQueue.findMany({
      where: { status: "failed" },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });
  },

  /**
   * Retry a single failed job manually
   */
  async retry(id: string) {
    return db.smsQueue.update({
      where: { id },
      data: {
        status: "queued",
        error: null,
      },
    });
  },
};

export default smsQueueService;

// =============================================================================
// END OF FILE
// =============================================================================

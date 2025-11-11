import { randomUUID } from "crypto";
import { BackupRequestSchema, RetryQueueActionSchema } from "../schemas/adminSchemas.js";
import { logInfo } from "../utils/logger.js";
import { parseWithSchema } from "../utils/validation.js";

type RetryQueueItem = {
  id: string;
  jobType: string;
  attempts: number;
  lastError: string | null;
};

class AdminService {
  private retryQueue: RetryQueueItem[] = [];
  private backups: { id: string; scope: string; createdAt: string }[] = [];

  constructor() {
    this.retryQueue.push({
      id: randomUUID(),
      jobType: "document-sync",
      attempts: 1,
      lastError: "Timeout",
    });
  }

  listRetryQueue(): RetryQueueItem[] {
    logInfo("Listing retry queue");
    return this.retryQueue;
  }

  retryJob(payload: unknown): { message: string } {
    const data = parseWithSchema(RetryQueueActionSchema, payload);
    logInfo("Retrying job", data);
    const item = this.retryQueue.find((job) => job.id === data.id);
    if (!item) {
      throw new Error(`Retry item ${data.id} not found`);
    }
    item.attempts += 1;
    item.lastError = null;
    return { message: `Retry scheduled for ${item.id}` };
  }

  clearJob(id: string): boolean {
    logInfo("Clearing job", { id });
    const before = this.retryQueue.length;
    this.retryQueue = this.retryQueue.filter((job) => job.id !== id);
    return before !== this.retryQueue.length;
  }

  requestBackup(payload: unknown): { backupId: string } {
    const data = parseWithSchema(BackupRequestSchema, payload);
    logInfo("Creating backup", data);
    const backup = {
      id: randomUUID(),
      scope: data.scope,
      createdAt: new Date().toISOString(),
    };
    this.backups.push(backup);
    return { backupId: backup.id };
  }

  listBackups(): { id: string; scope: string; createdAt: string }[] {
    logInfo("Listing backups");
    return this.backups;
  }
}

export const adminService = new AdminService();

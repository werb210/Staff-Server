import { request } from "./http";
import { BackupRecord, RetryJob } from "../types/api";

export const listRetryJobs = () =>
  request<RetryJob[]>({
    url: "/api/admin/retry-queue",
    method: "GET",
  });

export const retryJob = (id: string) =>
  request<RetryJob>({
    url: `/api/admin/retry-queue/${id}/retry`,
    method: "POST",
  });

export const listBackups = () =>
  request<BackupRecord[]>({
    url: "/api/admin/backups",
    method: "GET",
  });

export const createBackup = (name: string) =>
  request<BackupRecord>({
    url: "/api/admin/backups/create",
    method: "POST",
    data: { name },
  });

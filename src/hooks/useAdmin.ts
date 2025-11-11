import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../api";
import { BackupRecord, RetryJob } from "../types/api";

export function useAdmin() {
  const [retryJobs, setRetryJobs] = useState<RetryJob[]>([]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const [jobs, backupRecords] = await Promise.all([
        apiClient.getRetryQueue(),
        apiClient.getBackups(),
      ]);
      setRetryJobs(jobs);
      setBackups(backupRecords);
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "Unable to load admin data.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const retryJob = useCallback(async (id: string) => {
    const job = await apiClient.retryJob(id);
    setRetryJobs((prev) => prev.map((item) => (item.id === job.id ? job : item)));
    return job;
  }, []);

  const createBackup = useCallback(async (name: string) => {
    const backup = await apiClient.createBackup(name);
    setBackups((prev) => [backup, ...prev]);
    return backup;
  }, []);

  return {
    retryJobs,
    backups,
    loading,
    error,
    refresh,
    retryJob,
    createBackup,
  };
}

export type UseAdminReturn = ReturnType<typeof useAdmin>;

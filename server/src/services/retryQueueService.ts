// Auto-generated stub by Codex
// Stub retry queue service providing static entries

export type RetryQueueItem = {
  id: string;
  status: string;
};

class RetryQueueService {
  listQueue(): RetryQueueItem[] {
    return [{ id: "job-1", status: "queued" }];
  }
}

export const retryQueueService = new RetryQueueService();

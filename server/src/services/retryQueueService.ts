export interface RetryQueueItem {
  id: string;
  status: "queued" | "processing" | "failed" | "completed";
}

class RetryQueueService {
  private readonly queue: RetryQueueItem[] = [{ id: "job-1", status: "queued" }];

  listQueue(): RetryQueueItem[] {
    return [...this.queue];
  }

  retryItem(itemId: string): RetryQueueItem | null {
    const item = this.queue.find((entry) => entry.id === itemId);
    if (!item) {
      return null;
    }
    item.status = "processing";
    return { ...item };
  }
}

export const retryQueueService = new RetryQueueService();

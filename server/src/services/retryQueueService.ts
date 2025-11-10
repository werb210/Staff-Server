interface RetryJob {
  id: string;
  type: string;
}

/**
 * Stub retry queue service returning static jobs.
 */
class RetryQueueService {
  private readonly jobs: RetryJob[] = [
    {
      id: "job-1",
      type: "document-processing"
    }
  ];

  listJobs(): RetryJob[] {
    return [...this.jobs];
  }
}

export const retryQueueService = new RetryQueueService();

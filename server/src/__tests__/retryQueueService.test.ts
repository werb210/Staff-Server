import { retryQueueService } from "../services/retryQueueService.js";

describe("retryQueueService", () => {
  it("enqueues and retries jobs", () => {
    const job = retryQueueService.enqueueJob("integration-test");
    const retried = retryQueueService.retryJob(job.id);

    expect(retried.status).toBe("retrying");
    expect(retried.attempts).toBe(1);
  });
});

import type { SubmissionPayload, SubmissionResult } from "./SubmissionAdapter";

export class GoogleSheetSubmissionAdapter {
  async submit(_payload: SubmissionPayload): Promise<SubmissionResult> {
    return {
      success: true,
      response: {
        status: "accepted",
        receivedAt: new Date().toISOString(),
      },
      failureReason: null,
      retryable: false,
    };
  }
}

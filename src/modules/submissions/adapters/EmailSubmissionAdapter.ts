import { type SubmissionAdapter, type SubmissionPayload, type SubmissionResult } from "./SubmissionAdapter";

export class EmailSubmissionAdapter implements SubmissionAdapter {
  private to: string;
  private payload: SubmissionPayload;

  constructor(params: { to: string; payload: SubmissionPayload }) {
    this.to = params.to;
    this.payload = params.payload;
  }

  async submit(_input: SubmissionPayload): Promise<SubmissionResult> {
    const now = new Date().toISOString();
    void this.payload;
    return {
      success: true,
      response: {
        status: "accepted",
        detail: `Email accepted for delivery to ${this.to}.`,
        receivedAt: now,
        externalReference: "email_stub",
      },
      failureReason: null,
      retryable: false,
    };
  }
}

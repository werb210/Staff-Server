import { type SubmissionAdapter, type SubmissionResult } from "../SubmissionAdapter";

export class EmailAdapter implements SubmissionAdapter {
  private to: string;

  constructor(params: { to: string; payload: Record<string, unknown> }) {
    this.to = params.to;
    void params.payload;
  }

  async submit(_applicationId: string): Promise<SubmissionResult> {
    const now = new Date().toISOString();
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

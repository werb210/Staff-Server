export type SubmissionPayload = {
  application: {
    id: string;
    ownerUserId: string | null;
    name: string;
    metadata: unknown;
    productType: string;
    lenderId: string | null;
    lenderProductId: string | null;
    requestedAmount: number | null;
  };
  documents: Array<{
    documentId: string;
    documentType: string;
    title: string;
    versionId: string;
    version: number;
    metadata: unknown;
    content: string;
  }>;
  submittedAt: string;
};

export type SubmissionResponse = {
  status: string;
  detail?: string;
  receivedAt: string;
  externalReference?: string | null;
};

export type SubmissionResult = {
  success: boolean;
  response: SubmissionResponse;
  failureReason: string | null;
  retryable: boolean;
};

export interface SubmissionAdapter {
  submit(input: SubmissionPayload): Promise<SubmissionResult>;
}

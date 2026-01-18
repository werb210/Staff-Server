export type TransmissionRecord = {
  id: string;
  application_id: string;
  status: string;
  idempotency_key: string | null;
  lender_id: string;
  submitted_at: Date | null;
  payload: unknown | null;
  payload_hash: string | null;
  lender_response: unknown | null;
  response_received_at: Date | null;
  failure_reason: string | null;
  created_at: Date;
  updated_at: Date;
};

export const TRANSMISSIONS_PARTIAL_UNIQUE_INDEXES = [
  {
    name: "transmissions_idempotency_key_unique",
    columns: ["idempotency_key"],
    where: "idempotency_key is not null",
  },
] as const;

import { randomUUID } from "crypto";
import { pool } from "../../db";
import { AppError } from "../../middleware/errors";
import { getCircuitBreaker } from "../../utils/circuitBreaker";
import type { PoolClient } from "pg";

type Queryable = Pick<PoolClient, "query">;

export type CreditSummaryJobRecord = {
  id: string;
  application_id: string;
  status: string;
  retry_count: number;
  last_retry_at: Date | null;
  max_retries: number;
  started_at: Date | null;
  completed_at: Date | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
};

const CREDIT_BREAKER = getCircuitBreaker("credit_summary_generation", {
  failureThreshold: 3,
  cooldownMs: 60_000,
});

export async function ensureCreditSummaryJob(params: {
  applicationId: string;
  client?: Queryable;
}): Promise<CreditSummaryJobRecord> {
  if (!CREDIT_BREAKER.canRequest()) {
    throw new AppError("circuit_open", "Credit summary circuit breaker is open.", 503);
  }
  const runner = params.client ?? pool;
  const existing = await runner.query<CreditSummaryJobRecord>(
    `select id, application_id, status, retry_count, last_retry_at, max_retries,
            started_at, completed_at, error_message, created_at, updated_at
     from credit_summary_jobs
     where application_id = $1
     limit 1`,
    [params.applicationId]
  );
  if (existing.rows[0]) {
    CREDIT_BREAKER.recordSuccess();
    return existing.rows[0];
  }
  const res = await runner.query<CreditSummaryJobRecord>(
    `insert into credit_summary_jobs
     (id, application_id, status, created_at, updated_at)
     values ($1, $2, 'pending', now(), now())
     returning id, application_id, status, retry_count, last_retry_at, max_retries,
               started_at, completed_at, error_message, created_at, updated_at`,
    [randomUUID(), params.applicationId]
  );
  const record = res.rows[0];
  if (!record) {
    CREDIT_BREAKER.recordFailure();
    throw new AppError("data_error", "Credit summary job not created.", 500);
  }
  CREDIT_BREAKER.recordSuccess();
  return record;
}

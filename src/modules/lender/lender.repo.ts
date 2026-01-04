import { randomUUID } from "crypto";
import { pool } from "../../db";
import { type PoolClient } from "pg";

type Queryable = Pick<PoolClient, "query">;

export type LenderSubmissionRecord = {
  id: string;
  application_id: string;
  status: string;
  idempotency_key: string;
  created_at: Date;
  updated_at: Date;
};

export async function findSubmissionByIdempotencyKey(
  key: string,
  client?: Queryable
): Promise<LenderSubmissionRecord | null> {
  const runner = client ?? pool;
  const res = await runner.query<LenderSubmissionRecord>(
    `select id, application_id, status, idempotency_key, created_at, updated_at
     from lender_submissions
     where idempotency_key = $1
     limit 1`,
    [key]
  );
  return res.rows[0] ?? null;
}

export async function createSubmission(params: {
  applicationId: string;
  status: string;
  idempotencyKey: string;
  client?: Queryable;
}): Promise<LenderSubmissionRecord> {
  const runner = params.client ?? pool;
  const res = await runner.query<LenderSubmissionRecord>(
    `insert into lender_submissions
     (id, application_id, status, idempotency_key, created_at, updated_at)
     values ($1, $2, $3, $4, now(), now())
     returning id, application_id, status, idempotency_key, created_at, updated_at`,
    [randomUUID(), params.applicationId, params.status, params.idempotencyKey]
  );
  return res.rows[0];
}

export async function findSubmissionById(
  id: string,
  client?: Queryable
): Promise<LenderSubmissionRecord | null> {
  const runner = client ?? pool;
  const res = await runner.query<LenderSubmissionRecord>(
    `select id, application_id, status, idempotency_key, created_at, updated_at
     from lender_submissions
     where id = $1
     limit 1`,
    [id]
  );
  return res.rows[0] ?? null;
}

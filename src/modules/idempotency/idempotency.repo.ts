import { randomUUID } from "crypto";
import { pool } from "../../db";
import { type PoolClient } from "pg";

type Queryable = Pick<PoolClient, "query">;

export type IdempotencyRecord = {
  id: string;
  actor_user_id: string;
  scope: string;
  idempotency_key: string;
  status_code: number;
  response_body: unknown;
  created_at: Date;
};

export async function findIdempotencyRecord(params: {
  actorUserId: string;
  scope: string;
  idempotencyKey: string;
  client?: Queryable;
}): Promise<IdempotencyRecord | null> {
  const runner = params.client ?? pool;
  const res = await runner.query<IdempotencyRecord>(
    `select id, actor_user_id, scope, idempotency_key, status_code, response_body, created_at
     from idempotency_keys
     where actor_user_id = $1
       and scope = $2
       and idempotency_key = $3
     limit 1`,
    [params.actorUserId, params.scope, params.idempotencyKey]
  );
  return res.rows[0] ?? null;
}

export async function createIdempotencyRecord(params: {
  actorUserId: string;
  scope: string;
  idempotencyKey: string;
  statusCode: number;
  responseBody: unknown;
  client?: Queryable;
}): Promise<void> {
  const runner = params.client ?? pool;
  await runner.query(
    `insert into idempotency_keys
     (id, actor_user_id, scope, idempotency_key, status_code, response_body, created_at)
     values ($1, $2, $3, $4, $5, $6, now())`,
    [
      randomUUID(),
      params.actorUserId,
      params.scope,
      params.idempotencyKey,
      params.statusCode,
      params.responseBody,
    ]
  );
}

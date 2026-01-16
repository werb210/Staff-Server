import { randomUUID } from "crypto";
import { pool } from "../../db";
import { type PoolClient } from "pg";

type Queryable = Pick<PoolClient, "query">;

export type IdempotencyRecord = {
  id: string;
  key: string;
  route: string;
  request_hash: string | null;
  response_code: number;
  response_body: unknown;
  created_at: Date;
};

export async function findIdempotencyRecord(params: {
  route: string;
  idempotencyKey: string;
  client?: Queryable;
}): Promise<IdempotencyRecord | null> {
  const runner = params.client ?? pool;
  const res = await runner.query<IdempotencyRecord>(
    `select id, key, route, request_hash, response_code, response_body, created_at
     from idempotency_keys
     where route = $1
       and key = $2
       and created_at >= (now()::timestamp - interval '24 hours')
     limit 1`,
    [params.route, params.idempotencyKey]
  );
  return res.rows[0] ?? null;
}

export async function createIdempotencyRecord(params: {
  route: string;
  idempotencyKey: string;
  requestHash: string;
  responseCode: number;
  responseBody: unknown;
  method?: string | null;
  client?: Queryable;
}): Promise<void> {
  const runner = params.client ?? pool;
  const id = randomUUID();
  if (params.method) {
    try {
      await runner.query(
        `insert into idempotency_keys
         (id, key, route, method, request_hash, response_code, response_body, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, now())`,
        [
          id,
          params.idempotencyKey,
          params.route,
          params.method,
          params.requestHash,
          params.responseCode,
          params.responseBody,
        ]
      );
      return;
    } catch (error) {
      const code = (error as { code?: string }).code;
      const message = error instanceof Error ? error.message : "";
      if (code !== "42703" && !message.toLowerCase().includes("method")) {
        throw error;
      }
    }
  }
  await runner.query(
    `insert into idempotency_keys
     (id, key, route, request_hash, response_code, response_body, created_at)
     values ($1, $2, $3, $4, $5, $6, now())`,
    [
      id,
      params.idempotencyKey,
      params.route,
      params.requestHash,
      params.responseCode,
      params.responseBody,
    ]
  );
}

import { randomUUID } from "crypto";
import { pool } from "../db";
import { type PoolClient } from "pg";

export type LenderRecord = {
  id: string;
  name: string;
  phone: string;
  website: string | null;
  description: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
};

type Queryable = Pick<PoolClient, "query">;

export async function createLender(params: {
  name: string;
  phone: string;
  website?: string | null;
  description?: string | null;
  active: boolean;
  client?: Queryable;
}): Promise<LenderRecord> {
  const runner = params.client ?? pool;
  const res = await runner.query<LenderRecord>(
    `insert into lenders
     (id, name, phone, website, description, active, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, now(), now())
     returning id, name, phone, website, description, active, created_at, updated_at`,
    [
      randomUUID(),
      params.name,
      params.phone,
      params.website ?? null,
      params.description ?? null,
      params.active,
    ]
  );
  return res.rows[0];
}

export async function listLenders(client?: Queryable): Promise<LenderRecord[]> {
  const runner = client ?? pool;
  const res = await runner.query<LenderRecord>(
    `select id, name, phone, website, description, active, created_at, updated_at
     from lenders
     order by created_at desc`
  );
  return res.rows;
}

export async function getLenderById(
  lenderId: string,
  client?: Queryable
): Promise<LenderRecord | null> {
  const runner = client ?? pool;
  const res = await runner.query<LenderRecord>(
    `select id, name, phone, website, description, active, created_at, updated_at
     from lenders
     where id = $1
     limit 1`,
    [lenderId]
  );
  return res.rows[0] ?? null;
}

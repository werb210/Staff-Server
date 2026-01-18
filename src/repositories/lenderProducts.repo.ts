import { randomUUID } from "crypto";
import { pool } from "../db";
import { type PoolClient } from "pg";

export type LenderProductRecord = {
  id: string;
  lender_id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
};

type Queryable = Pick<PoolClient, "query">;

export async function createLenderProduct(params: {
  lenderId: string;
  name: string;
  description?: string | null;
  active: boolean;
  client?: Queryable;
}): Promise<LenderProductRecord> {
  const runner = params.client ?? pool;
  const res = await runner.query<LenderProductRecord>(
    `insert into lender_products
     (id, lender_id, name, description, active, created_at, updated_at)
     values ($1, $2, $3, $4, $5, now(), now())
     returning id, lender_id, name, description, active, created_at, updated_at`,
    [
      randomUUID(),
      params.lenderId,
      params.name,
      params.description ?? null,
      params.active,
    ]
  );
  return res.rows[0];
}

export async function listLenderProducts(
  client?: Queryable
): Promise<LenderProductRecord[]> {
  const runner = client ?? pool;
  const res = await runner.query<LenderProductRecord>(
    `select id, lender_id, name, description, active, created_at, updated_at
     from lender_products
     order by created_at desc`
  );
  return res.rows;
}

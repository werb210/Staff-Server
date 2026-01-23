import { type PoolClient } from "pg";
import { pool } from "../../db";

type Queryable = Pick<PoolClient, "query">;

export type CompanyRepoRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  owner_id: string | null;
  owner_record_id: string | null;
  owner_email: string | null;
  owner_phone: string | null;
};

export async function listCompanies(params?: {
  client?: Queryable;
}): Promise<CompanyRepoRow[]> {
  const runner = params?.client ?? pool;
  const result = await runner.query<CompanyRepoRow>(
    `
      select
        c.id,
        c.name,
        c.email,
        c.phone,
        c.owner_id,
        owner.id as owner_record_id,
        owner.email as owner_email,
        owner.phone as owner_phone
      from companies c
      left join users owner on owner.id = c.owner_id
      order by c.id
    `
  );

  return result.rows.length > 0 ? result.rows : [];
}

export async function findCompanyById(params: {
  companyId: string;
  client?: Queryable;
}): Promise<CompanyRepoRow | null> {
  const runner = params.client ?? pool;
  const result = await runner.query<CompanyRepoRow>(
    `
      select
        c.id,
        c.name,
        c.email,
        c.phone,
        c.owner_id,
        owner.id as owner_record_id,
        owner.email as owner_email,
        owner.phone as owner_phone
      from companies c
      left join users owner on owner.id = c.owner_id
      where c.id = $1
      limit 1
    `,
    [params.companyId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

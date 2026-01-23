import { type PoolClient } from "pg";
import { pool } from "../../db";

type Queryable = Pick<PoolClient, "query">;

export type ContactRepoRow = {
  id: string;
  email: string | null;
  phone: string | null;
  company_id: string | null;
  owner_id: string | null;
  company_record_id: string | null;
  company_name: string | null;
  owner_record_id: string | null;
  owner_email: string | null;
  owner_phone: string | null;
};

export async function listContacts(params: {
  companyId?: string | null;
  client?: Queryable;
}): Promise<ContactRepoRow[]> {
  const runner = params.client ?? pool;
  const values: Array<string> = [];
  const conditions: string[] = [];

  if (params.companyId) {
    values.push(params.companyId);
    conditions.push(`c.company_id = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `where ${conditions.join(" and ")}` : "";

  const result = await runner.query<ContactRepoRow>(
    `
      select
        c.id,
        c.email,
        c.phone,
        c.company_id,
        c.owner_id,
        company.id as company_record_id,
        company.name as company_name,
        owner.id as owner_record_id,
        owner.email as owner_email,
        owner.phone as owner_phone
      from contacts c
      left join companies company on company.id = c.company_id
      left join users owner on owner.id = c.owner_id
      ${whereClause}
      order by c.id
    `,
    values
  );

  return result.rows.length > 0 ? result.rows : [];
}

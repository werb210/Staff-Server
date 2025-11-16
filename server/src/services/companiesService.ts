import db from "../db.js";
import { Company } from "../types/company.js";

export async function getCompanies(): Promise<Company[]> {
  const { rows } = await db.query<Company>("SELECT * FROM companies ORDER BY created_at DESC");
  return rows;
}

export async function createCompany(data: any): Promise<Company> {
  const { name, website, phone } = data;
  const { rows } = await db.query<Company>(
    `INSERT INTO companies (name, website, phone)
     VALUES ($1, $2, $3) RETURNING *`,
    [name, website, phone]
  );
  return rows[0];
}

export async function getCompany(id: string): Promise<Company | null> {
  const { rows } = await db.query<Company>("SELECT * FROM companies WHERE id = $1", [id]);
  return rows[0] || null;
}

export async function updateCompany(id: string, data: any): Promise<Company> {
  const { name, website, phone } = data;
  const { rows } = await db.query<Company>(
    `UPDATE companies
     SET name=$1, website=$2, phone=$3, updated_at=NOW()
     WHERE id=$4
     RETURNING *`,
    [name, website, phone, id]
  );
  return rows[0];
}

export async function deleteCompany(id: string): Promise<void> {
  await db.query("DELETE FROM companies WHERE id=$1", [id]);
}

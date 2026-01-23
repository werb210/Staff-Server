import { type CompanyRepoRow, findCompanyById, listCompanies } from "./companies.repo";

export type CompanyOwner = {
  id: string;
  email: string | null;
  phone: string | null;
};

export type CompanyRecord = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  ownerId: string | null;
  owner: CompanyOwner | null;
};

function normalizeCompany(row: CompanyRepoRow): CompanyRecord {
  const owner =
    row.owner_record_id !== null
      ? {
          id: row.owner_record_id,
          email: row.owner_email ?? null,
          phone: row.owner_phone ?? null,
        }
      : null;

  return {
    id: row.id,
    name: row.name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    ownerId: row.owner_id ?? null,
    owner,
  };
}

export async function getCompanies(): Promise<CompanyRecord[]> {
  const rows = await listCompanies();
  if (rows.length === 0) {
    return [];
  }
  return rows.map((row) => normalizeCompany(row));
}

export async function getCompanyById(companyId: string): Promise<CompanyRecord | null> {
  const row = await findCompanyById({ companyId });
  if (!row) {
    return null;
  }
  return normalizeCompany(row);
}

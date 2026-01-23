import { type LenderRecord } from "../db/schema/lenders";
import { getLenderById, listLenders } from "../repositories/lenders.repo";

function normalizeLenderCountry<T extends { country?: string | null }>(
  row: T
): T & { country: string | null } {
  return {
    ...row,
    country: row.country ?? null,
  };
}

export async function listLendersService(): Promise<LenderRecord[]> {
  const lenders = await listLenders();
  const safeLenders = Array.isArray(lenders) ? lenders : [];
  return safeLenders.map((row) => normalizeLenderCountry(row));
}

export async function getLenderByIdService(
  id: string
): Promise<LenderRecord | null> {
  const lender = await getLenderById(id);
  if (!lender) {
    return null;
  }
  return normalizeLenderCountry(lender);
}

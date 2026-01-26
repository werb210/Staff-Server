import { type LenderRecord } from "../db/schema/lenders";
import { pool } from "../db";
import { getLenderById, listLenders } from "../repositories/lenders.repo";

export async function listLendersService(): Promise<LenderRecord[]> {
  return listLenders(pool);
}

export async function getLenderByIdService(
  id: string
): Promise<LenderRecord | null> {
  return getLenderById(id);
}

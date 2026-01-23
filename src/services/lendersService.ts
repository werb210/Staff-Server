import { type LenderRecord } from "../db/schema/lenders";
import { getLenderById, listLenders } from "../repositories/lenders.repo";

export async function listLendersService(): Promise<LenderRecord[]> {
  return listLenders();
}

export async function getLenderByIdService(
  id: string
): Promise<LenderRecord | null> {
  return getLenderById(id);
}

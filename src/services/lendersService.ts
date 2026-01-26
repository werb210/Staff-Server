import { pool } from "../db";
import { getLenderById, listLenders } from "../repositories/lenders.repo";

export async function listLendersService() {
  return listLenders(pool);
}

export async function getLenderByIdService(
  id: string
): Promise<Awaited<ReturnType<typeof getLenderById>> | null> {
  return getLenderById(id);
}

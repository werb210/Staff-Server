import { dbQuery } from "../db";

export async function getActiveLenderCount(): Promise<number> {
  const result = await dbQuery<{ count: number }>(
    "select count(*)::int as count from lenders where active = true"
  );
  return result.rows[0]?.count ?? 0;
}

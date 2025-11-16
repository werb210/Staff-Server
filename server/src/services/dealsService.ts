import db from "../db.js";
import { Deal } from "../types/deal.js";

export async function getDeals(): Promise<Deal[]> {
  const { rows } = await db.query<Deal>("SELECT * FROM deals ORDER BY created_at DESC");
  return rows;
}

export async function createDeal(data: any): Promise<Deal> {
  const { name, status, amount } = data;
  const { rows } = await db.query<Deal>(
    `INSERT INTO deals (name, status, amount)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, status, amount]
  );
  return rows[0];
}

export async function getDeal(id: string): Promise<Deal | null> {
  const { rows } = await db.query<Deal>("SELECT * FROM deals WHERE id = $1", [id]);
  return rows[0] || null;
}

export async function updateDeal(id: string, data: any): Promise<Deal> {
  const { name, status, amount } = data;
  const { rows } = await db.query<Deal>(
    `UPDATE deals
     SET name=$1, status=$2, amount=$3, updated_at=NOW()
     WHERE id=$4 RETURNING *`,
    [name, status, amount, id]
  );
  return rows[0];
}

export async function deleteDeal(id: string): Promise<void> {
  await db.query("DELETE FROM deals WHERE id=$1", [id]);
}

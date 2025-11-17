// server/src/services/lenderService.ts
import { registry } from "../db/registry.js";

export const lenderService = {
  async all() {
    const { rows } = await registry.pool.query(
      `SELECT * FROM lenders ORDER BY created_at DESC`
    );
    return rows;
  },

  async get(id: string) {
    const { rows } = await registry.pool.query(
      `SELECT * FROM lenders WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async create(data: any) {
    const { rows } = await registry.pool.query(
      `INSERT INTO lenders (name, product_type, country, min_amount, max_amount)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.name,
        data.product_type,
        data.country,
        data.min_amount,
        data.max_amount,
      ]
    );
    return rows[0];
  },

  async update(id: string, data: any) {
    const { rows } = await registry.pool.query(
      `UPDATE lenders
       SET name = $1,
           product_type = $2,
           country = $3,
           min_amount = $4,
           max_amount = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        data.name,
        data.product_type,
        data.country,
        data.min_amount,
        data.max_amount,
        id,
      ]
    );
    return rows[0] || null;
  },
};

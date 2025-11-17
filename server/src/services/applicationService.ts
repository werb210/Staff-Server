// server/src/services/applicationService.ts
import { registry } from "../db/registry.js";

export const applicationService = {
  async all() {
    const { rows } = await registry.pool.query(
      `SELECT * FROM applications ORDER BY created_at DESC`
    );
    return rows;
  },

  async get(id: string) {
    const { rows } = await registry.pool.query(
      `SELECT * FROM applications WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async create(data: any) {
    const { rows } = await registry.pool.query(
      `INSERT INTO applications (data)
       VALUES ($1)
       RETURNING *`,
      [data]
    );
    return rows[0];
  },

  async update(id: string, data: any) {
    const { rows } = await registry.pool.query(
      `UPDATE applications
       SET data = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [data, id]
    );
    return rows[0] || null;
  },
};

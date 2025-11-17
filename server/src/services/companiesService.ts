/// server/src/services/companiesService.ts

import { db, registry } from "../db/registry.js";

export const companiesService = {
  async all() {
    const result = await db.query(`
      SELECT * FROM companies
      ORDER BY created_at DESC
    `);
    return result.rows;
  },

  async get(id: string) {
    const result = await db.query(
      `SELECT * FROM companies WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  },
};

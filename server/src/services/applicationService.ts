// server/src/services/applicationService.ts

import { db, registry } from "../db/registry.js";

export const applicationService = {
  async all() {
    const result = await db.query(`
      SELECT * FROM applications
      ORDER BY created_at DESC
    `);
    return result.rows;
  },

  async get(id: string) {
    const result = await db.query(
      `SELECT * FROM applications WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  },
};

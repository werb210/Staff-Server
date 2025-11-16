// server/src/services/lenderService.ts
import { registry } from "../db/registry.js";

export const lenderService = {
  async all() {
    const result = await registry.system.query("SELECT * FROM lenders LIMIT 200");
    return result.rows;
  },

  async get(id: string) {
    const result = await registry.system.query("SELECT * FROM lenders WHERE id = $1", [id]);
    return result.rows[0] || null;
  },
};

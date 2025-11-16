// server/src/services/dealsService.ts
import { registry } from "../db/registry.js";

export const dealsService = {
  async all() {
    const result = await registry.system.query("SELECT * FROM deals LIMIT 200");
    return result.rows;
  },
  async get(id: string) {
    const result = await registry.system.query("SELECT * FROM deals WHERE id = $1", [id]);
    return result.rows[0] || null;
  },
};

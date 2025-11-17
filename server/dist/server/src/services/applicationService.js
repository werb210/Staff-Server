import { registry } from "../db/registry.js";

export const applicationService = {
  async all() {
    const result = await registry.system.query(
      "SELECT * FROM applications LIMIT 100"
    );
    return result.rows;
  },

  async get(id) {
    const result = await registry.system.query(
      "SELECT * FROM applications WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  },
};

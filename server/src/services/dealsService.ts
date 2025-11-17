// server/src/services/dealsService.ts
import db, { registry } from "../db/registry.js";

export const dealsService = {
  async all() {
    return db.select().from(registry.deals);
  },
};

export default dealsService;

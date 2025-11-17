// server/src/services/companiesService.ts
import db, { registry } from "../db/registry.js";

export const companiesService = {
  async all() {
    return db.select().from(registry.companies);
  },
};

export default companiesService;

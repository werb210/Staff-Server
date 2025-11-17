// server/src/services/applicationService.ts
import db, { registry } from "../db/registry.js";

export const applicationService = {
  async all() {
    return db.select().from(registry.applications);
  },
};

export default applicationService;

// server/src/services/dealsService.ts

import { registry } from "../db/registry.js";

export const dealsService = {
  async all() {
    return [];
  },

  async get(id: string) {
    return { id, mock: true };
  },

  async create(data: any) {
    return { id: "new-id", ...data };
  },

  async update(id: string, data: any) {
    return { id, ...data };
  },

  async delete(id: string) {
    return { id, deleted: true };
  },
};

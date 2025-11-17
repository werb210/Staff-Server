// server/src/services/applicationService.ts

import { registry } from "../db/registry.js";

/**
 * Application Service
 * Temporary implementation until DB models are wired.
 * Provides the methods controllers expect: all(), get(), create(), update(), delete()
 */

export const applicationService = {
  async all() {
    // Placeholder implementation
    return [];
  },

  async get(id: string) {
    // Placeholder until real DB logic exists
    return { id, mock: true };
  },

  async create(data: any) {
    // Placeholder
    return { id: "new-id", ...data };
  },

  async update(id: string, data: any) {
    // Placeholder
    return { id, ...data };
  },

  async delete(id: string) {
    // Placeholder
    return { id, deleted: true };
  },
};

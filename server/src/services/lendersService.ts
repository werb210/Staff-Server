import lendersRepo from "../db/repositories/lenders.repo.js";

export const lendersService = {
  async list() {
    return lendersRepo.findMany();
  },

  async get(id: string) {
    return lendersRepo.findById(id);
  },

  async create(data: Partial<typeof import("../db/schema/lenders.js").lenders.$inferInsert>) {
    return lendersRepo.create(data);
  },

  async update(id: string, data: Partial<typeof import("../db/schema/lenders.js").lenders.$inferInsert>) {
    return lendersRepo.update(id, data);
  },

  async delete(id: string) {
    return lendersRepo.delete(id);
  },
};

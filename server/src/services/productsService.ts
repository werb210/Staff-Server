// server/src/services/productsService.ts
import productsRepo from "../db/repositories/products.repo.js";

export const productsService = {
  async list() {
    return productsRepo.findMany();
  },

  async get(id: string) {
    return productsRepo.findById(id);
  },

  async create(data: unknown) {
    return productsRepo.create(data as Record<string, unknown>);
  },

  async update(id: string, data: unknown) {
    return productsRepo.update(id, data as Record<string, unknown>);
  },

  async delete(id: string) {
    return productsRepo.delete(id);
  },
};

export default productsService;

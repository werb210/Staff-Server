import { lendersRepo } from "../db/repositories/lenders.repo";

export const lendersService = {
  async list() {
    return lendersRepo.listAll();
  },

  async get(id: string) {
    return lendersRepo.findById(id);
  },

  async create(data: any) {
    return lendersRepo.create(data);
  },

  async update(id: string, data: any) {
    return lendersRepo.update(id, data);
  }
};

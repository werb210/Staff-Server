import { dealsRepo } from "../db/repositories/deals.repo";

export const dealsService = {
  async list() {
    return dealsRepo.listAll();
  },

  async get(id: string) {
    return dealsRepo.findById(id);
  },

  async create(data: any) {
    return dealsRepo.create(data);
  },

  async update(id: string, data: any) {
    return dealsRepo.update(id, data);
  }
};

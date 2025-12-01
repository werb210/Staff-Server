import { companiesRepo } from "../db/repositories/companies.repo";

export const companiesService = {
  async list() {
    return companiesRepo.listAll();
  },

  async get(id: string) {
    return companiesRepo.findById(id);
  },

  async create(data: any) {
    return companiesRepo.create(data);
  },

  async update(id: string, data: any) {
    return companiesRepo.update(id, data);
  }
};

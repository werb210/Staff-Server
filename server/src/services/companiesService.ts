// server/src/services/companiesService.ts
import companiesRepo from "../db/repositories/companies.repo.js";

export const companiesService = {
  list() {
    return companiesRepo.findMany();
  },

  get(id: string) {
    return companiesRepo.findById(id);
  },

  create(data: Record<string, unknown>) {
    return companiesRepo.create(data);
  },

  update(id: string, data: Record<string, unknown>) {
    return companiesRepo.update(id, data);
  },

  delete(id: string) {
    return companiesRepo.delete(id);
  },
};

import companiesRepo from "../db/repositories/companies.repo.js";

export const companiesService = {
  listAll: () => companiesRepo.findMany({}),
  get: (id: string) => companiesRepo.findById(id),
  create: (data: any) => companiesRepo.create(data),
  update: (id: string, data: any) => companiesRepo.update(id, data),
  remove: (id: string) => companiesRepo.delete(id),
};

export default companiesService;

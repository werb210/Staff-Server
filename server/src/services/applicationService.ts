import { applicationsRepo } from "../db/repositories/applications.repo";
import { ApplicationInput } from "../types/app";

export const applicationService = {
  async create(data: ApplicationInput) {
    return applicationsRepo.create(data);
  },

  async findById(id: string) {
    return applicationsRepo.findById(id);
  },

  async update(id: string, data: Partial<ApplicationInput>) {
    return applicationsRepo.update(id, data);
  },

  async remove(id: string) {
    return applicationsRepo.remove(id);
  },

  async listByUser(userId: string) {
    return applicationsRepo.listByUser(userId);
  }
};

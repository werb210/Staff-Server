import { applicationsRepo } from "../db/repositories/applications.repo";

export const applicationsService = {
  async list() {
    return applicationsRepo.listAll();
  },

  async search(term: string) {
    return applicationsRepo.search(term);
  }
};

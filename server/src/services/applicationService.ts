import applicationsRepo from "../db/repositories/applications.repo.js";

export const applicationService = {
  create(data: any) {
    return applicationsRepo.create(data);
  },

  update(id: string, data: any) {
    return applicationsRepo.update(id, data);
  },

  get(id: string) {
    return applicationsRepo.findById(id);
  },
};

export default applicationService;

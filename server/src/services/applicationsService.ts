import applicationsRepo from "../db/repositories/applications.repo.js";

export const applicationsService = {
  list() {
    return applicationsRepo.findMany({});
  },

  create(data: any) {
    return applicationsRepo.create(data);
  },

  update(id: string, data: any) {
    return applicationsRepo.update(id, data);
  },
};

export default applicationsService;

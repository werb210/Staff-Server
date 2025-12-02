import usersRepo from "../db/repositories/users.repo.js";

export const usersService = {
  list() {
    return usersRepo.findMany({});
  },

  get(id: string) {
    return usersRepo.findById(id);
  },

  create(data: any) {
    return usersRepo.create(data);
  },

  update(id: string, data: any) {
    return usersRepo.update(id, data);
  },

  remove(id: string) {
    return usersRepo.delete(id);
  },
};

export default usersService;

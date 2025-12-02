import contactsRepo from "../db/repositories/contacts.repo.js";

export const contactsService = {
  create(data: any) {
    return contactsRepo.create(data);
  },

  update(id: string, data: any) {
    return contactsRepo.update(id, data);
  },

  get(id: string) {
    return contactsRepo.findById(id);
  },

  list() {
    return contactsRepo.findMany({});
  },
};

export default contactsService;

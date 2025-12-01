// server/src/services/contactsService.ts
import contactsRepo from "../db/repositories/contacts.repo.js";

export const contactsService = {
  list() {
    return contactsRepo.findMany();
  },

  get(id: string) {
    return contactsRepo.findById(id);
  },

  create(data: Record<string, unknown>) {
    return contactsRepo.create(data);
  },

  update(id: string, data: Record<string, unknown>) {
    return contactsRepo.update(id, data);
  },

  delete(id: string) {
    return contactsRepo.delete(id);
  },
};

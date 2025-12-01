import { contactsRepo } from "../db/repositories/contacts.repo";

export const contactsService = {
  async list(companyId: string) {
    return contactsRepo.listByCompany(companyId);
  },

  async get(id: string) {
    return contactsRepo.findById(id);
  },

  async create(data: any) {
    return contactsRepo.create(data);
  },

  async update(id: string, data: any) {
    return contactsRepo.update(id, data);
  }
};

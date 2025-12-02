import messagesRepo from "../db/repositories/messages.repo.js";

export const notificationsService = {
  listAll: () => messagesRepo.findMany({}),
  get: (id: string) => messagesRepo.findById(id),
  create: (data: any) => messagesRepo.create(data),
  update: (id: string, data: any) => messagesRepo.update(id, data),
  remove: (id: string) => messagesRepo.delete(id),
};

export default notificationsService;

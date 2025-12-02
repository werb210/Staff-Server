import messagesRepo from "../db/repositories/messages.repo.js";

export const chatService = {
  async send(applicationId: string, senderId: string, body: string) {
    return messagesRepo.create({
      applicationId,
      senderId,
      body,
      createdAt: new Date(),
    });
  },

  async thread(applicationId: string) {
    return messagesRepo.findMany({ applicationId });
  },
};

export default chatService;

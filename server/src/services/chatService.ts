import { messagesRepo } from "../db/repositories/messages.repo";

export const chatService = {
  async send(fromId: string, toId: string, text: string) {
    return messagesRepo.insert({
      fromId,
      toId,
      text,
      createdAt: new Date()
    });
  },

  async thread(userA: string, userB: string) {
    return messagesRepo.thread(userA, userB);
  }
};

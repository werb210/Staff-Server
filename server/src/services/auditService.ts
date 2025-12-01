import { auditLogsRepo } from "../db/repositories/auditLogs.repo.js";

export const auditService = {
  async log(event: string, payload: any, userId: string | null = null) {
    return auditLogsRepo.insert({
      event,
      payload,
      userId,
      createdAt: new Date()
    });
  },

  async list(limit = 100) {
    return auditLogsRepo.list(limit);
  }
};

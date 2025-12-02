import smsLogsRepo from "../db/repositories/smsLogs.repo.js";

export const smsService = {
  async log(payload: any) {
    return smsLogsRepo.create({
      ...payload,
      createdAt: new Date(),
    });
  },
};

export default smsService;

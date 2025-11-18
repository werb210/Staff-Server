import prisma from "../db/prisma.js";

export const smsService = {
  async queueSMS(data: any) {
    return prisma.smsQueue.create({ data });
  },

  async listQueued() {
    return prisma.smsQueue.findMany();
  },

  async markSent(id: string) {
    return prisma.smsQueue.update({
      where: { id },
      data: { sent: true }
    });
  }
};

export default smsService;

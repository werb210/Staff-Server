import prisma from "../db/prisma.js";

export const emailService = {
  async queueEmail(data: any) {
    return prisma.emailQueue.create({ data });
  },

  async listQueued() {
    return prisma.emailQueue.findMany();
  },

  async markSent(id: string) {
    return prisma.emailQueue.update({
      where: { id },
      data: { sent: true }
    });
  }
};

export default emailService;

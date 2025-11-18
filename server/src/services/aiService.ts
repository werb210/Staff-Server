import { prisma } from "../db/index.js";

export const aiService = {
  logRequest(type: string, input: any, output: any) {
    return prisma.aiLog.create({
      data: { type, input, output },
    });
  },
};

export default aiService;

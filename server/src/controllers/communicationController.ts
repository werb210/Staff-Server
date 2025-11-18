import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";

export const communicationController = {
  async list(req: Request, res: Response) {
    const records = await prisma.communicationLog.findMany();
    res.json(records);
  },

  async create(req: Request, res: Response) {
    const record = await prisma.communicationLog.create({
      data: req.body,
    });
    res.json(record);
  },
};

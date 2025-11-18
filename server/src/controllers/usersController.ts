import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";

export const usersController = {
  async list(req: Request, res: Response) {
    const users = await prisma.user.findMany();
    res.json(users);
  },

  async get(req: Request, res: Response) {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  },

  async create(req: Request, res: Response) {
    const data = req.body;
    const user = await prisma.user.create({ data });
    res.json(user);
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id },
      data: req.body,
    });
    res.json(user);
  },

  async remove(req: Request, res: Response) {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  },
};

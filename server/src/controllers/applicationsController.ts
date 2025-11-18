import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";

export const applicationsController = {
  async list(req: Request, res: Response) {
    const apps = await prisma.application.findMany({
      include: { company: true, contacts: true, documents: true },
    });
    res.json(apps);
  },

  async get(req: Request, res: Response) {
    const { id } = req.params;
    const app = await prisma.application.findUnique({
      where: { id },
      include: { company: true, contacts: true, documents: true },
    });
    if (!app) return res.status(404).json({ error: "Not found" });
    res.json(app);
  },

  async create(req: Request, res: Response) {
    const data = req.body;
    const created = await prisma.application.create({ data });
    res.json(created);
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const data = req.body;
    const updated = await prisma.application.update({ where: { id }, data });
    res.json(updated);
  },

  async remove(req: Request, res: Response) {
    const { id } = req.params;
    await prisma.application.delete({ where: { id } });
    res.json({ success: true });
  },
};

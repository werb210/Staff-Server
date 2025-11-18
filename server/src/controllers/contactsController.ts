import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";

export const contactsController = {
  async list(req: Request, res: Response) {
    const items = await prisma.contact.findMany();
    res.json(items);
  },

  async get(req: Request, res: Response) {
    const { id } = req.params;
    const item = await prisma.contact.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  },

  async create(req: Request, res: Response) {
    const created = await prisma.contact.create({ data: req.body });
    res.json(created);
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const updated = await prisma.contact.update({
      where: { id },
      data: req.body,
    });
    res.json(updated);
  },

  async remove(req: Request, res: Response) {
    const { id } = req.params;
    await prisma.contact.delete({ where: { id } });
    res.json({ success: true });
  },
};

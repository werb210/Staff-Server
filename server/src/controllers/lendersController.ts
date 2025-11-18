import { prisma } from "../db/prisma.js";
import { Request, Response } from "express";

export const lendersController = {
  async list(req: Request, res: Response) {
    const items = await prisma.lender.findMany({
      include: { products: true },
    });
    res.json(items);
  },

  async get(req: Request, res: Response) {
    const { id } = req.params;
    const item = await prisma.lender.findUnique({
      where: { id },
      include: { products: true },
    });
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  },

  async create(req: Request, res: Response) {
    const created = await prisma.lender.create({ data: req.body });
    res.json(created);
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const updated = await prisma.lender.update({
      where: { id },
      data: req.body,
    });
    res.json(updated);
  },

  async remove(req: Request, res: Response) {
    const { id } = req.params;
    await prisma.lender.delete({ where: { id } });
    res.json({ success: true });
  },
};

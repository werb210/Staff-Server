import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";

export const productsController = {
  async list(req: Request, res: Response) {
    const items = await prisma.product.findMany({
      include: { lender: true },
    });
    res.json(items);
  },

  async get(req: Request, res: Response) {
    const { id } = req.params;
    const item = await prisma.product.findUnique({
      where: { id },
      include: { lender: true },
    });
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  },

  async create(req: Request, res: Response) {
    const created = await prisma.product.create({ data: req.body });
    res.json(created);
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const updated = await prisma.product.update({
      where: { id },
      data: req.body,
    });
    res.json(updated);
  },

  async remove(req: Request, res: Response) {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  },
};

// server/src/controllers/productsController.ts
import type { Request, Response } from "express";
import prisma from "../db/prisma"; // Prisma client

export const productsController = {
  async list(_req: Request, res: Response) {
    const rows = await prisma.products.findMany();
    res.json({ ok: true, data: rows });
  },

  async get(req: Request, res: Response) {
    const row = await prisma.products.findUnique({
      where: { id: req.params.id },
    });
    if (!row) return res.status(404).json({ ok: false });
    res.json({ ok: true, data: row });
  },

  async create(req: Request, res: Response) {
    const created = await prisma.products.create({
      data: req.body,
    });
    res.json({ ok: true, data: created });
  },

  async update(req: Request, res: Response) {
    const updated = await prisma.products.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ ok: true, data: updated });
  },

  async remove(req: Request, res: Response) {
    await prisma.products.delete({
      where: { id: req.params.id },
    });
    res.json({ ok: true });
  },
};

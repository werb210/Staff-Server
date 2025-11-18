import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";

export const pipelineController = {
  async listStages(req: Request, res: Response) {
    const stages = await prisma.pipelineStage.findMany({
      include: { cards: true },
    });
    res.json(stages);
  },

  async move(req: Request, res: Response) {
    const { cardId, toStageId } = req.body;

    const updated = await prisma.pipelineCard.update({
      where: { id: cardId },
      data: { stageId: toStageId },
    });

    res.json(updated);
  },
};

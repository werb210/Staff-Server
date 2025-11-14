import type { Request, Response } from "express";
import type { Silo } from "../services/prisma.js";
import { notificationService } from "../services/notificationService.js";

const toSilo = (value: string): Silo => value as Silo;

export const triggerNotification = async (req: Request, res: Response) => {
  const user = req.user!;
  const silo = toSilo(req.params.silo);
  const payload = req.body ?? {};

  const result = await notificationService.trigger(user, silo, payload);
  return res.json(result);
};

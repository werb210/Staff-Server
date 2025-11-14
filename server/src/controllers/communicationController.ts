import type { Request, Response } from "express";
import type { Silo } from "../services/prisma.js";
import { communicationService } from "../services/communicationService.js";

const toSilo = (value: string): Silo => value as Silo;

export const sendSMS = async (req: Request, res: Response) => {
  const user = req.user!;
  const silo = toSilo(req.params.silo);

  const result = await communicationService.sendSMS(user, silo, req.body ?? {});
  return res.json(result);
};

export const sendEmail = async (req: Request, res: Response) => {
  const user = req.user!;
  const silo = toSilo(req.params.silo);

  const result = await communicationService.sendEmail(user, silo, req.body ?? {});
  return res.json(result);
};

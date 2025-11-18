// FILE: server/src/controllers/communicationController.ts
import { Request, Response } from "express";
import communicationService from "../services/communicationService.js";

export const sendSMS = async (req: Request, res: Response) => {
  const r = await communicationService.sendSMS(req.body);
  res.json(r);
};

export const sendEmail = async (req: Request, res: Response) => {
  const r = await communicationService.sendEmail(req.body);
  res.json(r);
};

export default { sendSMS, sendEmail };

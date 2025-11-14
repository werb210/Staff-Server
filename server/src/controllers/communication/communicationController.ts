import type { Request, Response } from "express";
import { smsService } from "../../services/communication/smsService.js";
import { emailService } from "../../services/communication/emailService.js";

export async function sendSMS(req: Request, res: Response) {
  const user = req.user;
  const { to, body, silo } = req.body;

  const msg = await smsService.send(user, silo, to, body);
  return res.status(201).json({ message: "OK", data: msg });
}

export async function listSMSThreads(req: Request, res: Response) {
  const user = req.user;
  const { silo } = req.params;

  const threads = await smsService.listThreads(user, silo);
  return res.json({ message: "OK", data: threads });
}

export async function sendEmail(req: Request, res: Response) {
  const user = req.user;
  const { to, subject, body, silo } = req.body;

  const msg = await emailService.send(user, silo, to, subject, body);
  return res.status(201).json({ message: "OK", data: msg });
}

export async function listEmailThreads(req: Request, res: Response) {
  const user = req.user;
  const { silo } = req.params;

  const threads = await emailService.listThreads(user, silo);
  return res.json({ message: "OK", data: threads });
}

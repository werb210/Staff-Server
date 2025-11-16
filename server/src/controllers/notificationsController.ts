import { Request, Response } from "express";
import * as notificationsService from "../services/notificationsService.js";

export async function triggerNotification(req: Request, res: Response) {
  const { silo } = req.params;
  const { message } = req.body;

  const notif = await notificationsService.createNotification(silo, message);
  return res.status(201).json(notif);
}

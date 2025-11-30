// server/src/controllers/chatController.ts
import { Request, Response } from 'express';
import * as chatService from '../services/chatService.js';

//
// ======================================================
//  SEND MESSAGE
// ======================================================
//
export async function sendMessage(req: Request, res: Response) {
  try {
    const { applicationId, sender, body } = req.body;

    if (!applicationId || !sender || !body) {
      return res.status(400).json({ error: 'applicationId, sender, and body required.' });
    }

    const msg = await chatService.sendMessage(applicationId, sender, body);

    return res.status(200).json(msg);
  } catch (err: any) {
    console.error('sendMessage error →', err);
    return res.status(500).json({ error: err.message });
  }
}

//
// ======================================================
//  GET MESSAGES
// ======================================================
//
export async function getMessages(req: Request, res: Response) {
  try {
    const { applicationId } = req.params;

    const messages = await chatService.getMessages(applicationId);

    return res.status(200).json(messages);
  } catch (err: any) {
    console.error('getMessages error →', err);
    return res.status(500).json({ error: err.message });
  }
}

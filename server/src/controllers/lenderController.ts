// server/src/controllers/lenderController.ts
import { Request, Response } from 'express';
import * as lenderService from '../services/lenderService.js';

export async function matchLenders(req: Request, res: Response) {
  try {
    const { applicationId } = req.params;
    const results = await lenderService.match(applicationId);
    return res.status(200).json(results);
  } catch (err: any) {
    console.error("matchLenders error →", err);
    return res.status(500).json({ error: err.message });
  }
}

export async function sendToLender(req: Request, res: Response) {
  try {
    const { applicationId, lenderId } = req.params;

    const result = await lenderService.sendToLender(applicationId, lenderId);

    return res.status(200).json(result);
  } catch (err: any) {
    console.error("sendToLender error →", err);
    return res.status(500).json({ error: err.message });
  }
}

// server/src/controllers/signingController.ts
import { Request, Response } from 'express';
import * as signingService from '../services/signingService.js';

//
// ======================================================
//  CLIENT STARTS SIGNING SESSION
// ======================================================
//
export async function startSigning(req: Request, res: Response) {
  try {
    const { applicationId } = req.params;

    const session = await signingService.initSigning(applicationId);

    return res.status(200).json(session);
  } catch (err: any) {
    console.error('startSigning error →', err);
    return res.status(500).json({ error: err.message });
  }
}

//
// ======================================================
//  SERVER RETRIEVES SIGNED PDF (webhook or polling)
// ======================================================
//
export async function completeSigning(req: Request, res: Response) {
  try {
    const { applicationId } = req.params;

    const result = await signingService.completeSigning(applicationId);

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('completeSigning error →', err);
    return res.status(500).json({ error: err.message });
  }
}

//
// ======================================================
//  GET SIGNATURE STATUS
// ======================================================
//
export async function getStatus(req: Request, res: Response) {
  try {
    const { applicationId } = req.params;

    const result = await signingService.getStatus(applicationId);

    return res.status(200).json(result || {});
  } catch (err: any) {
    console.error('getStatus error →', err);
    return res.status(500).json({ error: err.message });
  }
}

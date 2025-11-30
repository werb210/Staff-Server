// server/src/controllers/applicationController.ts
import { Request, Response } from 'express';
import * as applicationService from '../services/applicationService.js';

//
// ======================================================
//  Start or Resume Application
// ======================================================
//
export async function startApplication(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Applicant email is required.' });
    }

    const app = await applicationService.startOrResume(email);

    return res.status(200).json(app);
  } catch (err: any) {
    console.error('startApplication error →', err);
    return res.status(500).json({ error: err.message });
  }
}

//
// ======================================================
//  Update a single step (autosave)
// ======================================================
//
export async function updateStep(req: Request, res: Response) {
  try {
    const { applicationId } = req.params;
    const { stepId, data } = req.body;

    if (!stepId || !data) {
      return res.status(400).json({ error: 'stepId and data are required.' });
    }

    const updated = await applicationService.updateStep(applicationId, stepId, data);

    return res.status(200).json(updated);
  } catch (err: any) {
    console.error('updateStep error →', err);
    return res.status(500).json({ error: err.message });
  }
}

//
// ======================================================
//  Submit Application
// ======================================================
//
export async function submitApplication(req: Request, res: Response) {
  try {
    const { applicationId } = req.params;

    const submitted = await applicationService.submit(applicationId);

    return res.status(200).json(submitted);
  } catch (err: any) {
    console.error('submitApplication error →', err);
    return res.status(500).json({ error: err.message });
  }
}

//
// ======================================================
//  Fetch Application (e.g., Dashboard)
// ======================================================
//
export async function getApplication(req: Request, res: Response) {
  try {
    const { applicationId } = req.params;

    const result = await applicationService.get(applicationId);

    if (!result) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('getApplication error →', err);
    return res.status(500).json({ error: err.message });
  }
}

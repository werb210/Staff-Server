// server/src/routes/application.ts
import { Router } from 'express';
import * as applicationController from '../controllers/applicationController.js';

const router = Router();

// Create or resume application draft
router.post('/start', applicationController.startApplication);

// Update a specific application step (autosave)
router.post('/:applicationId/update-step', applicationController.updateStep);

// Submit the full application
router.post('/:applicationId/submit', applicationController.submitApplication);

// Get application details (used by client portal dashboard)
router.get('/:applicationId', applicationController.getApplication);

export default router;

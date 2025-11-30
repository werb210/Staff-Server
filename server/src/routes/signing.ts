// server/src/routes/signing.ts
import { Router } from 'express';
import * as signingController from '../controllers/signingController.js';

const router = Router();

// Initialize signing session
router.post('/start/:applicationId', signingController.startSigning);

// Fetch signed PDF (polling or webhook fallback)
router.post('/complete/:applicationId', signingController.completeSigning);

// Get signature status
router.get('/status/:applicationId', signingController.getStatus);

export default router;

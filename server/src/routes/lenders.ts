// server/src/routes/lenders.ts
import { Router } from 'express';
import * as lenderController from '../controllers/lenderController.js';

const router = Router();

// Get matches for an application
router.get('/match/:applicationId', lenderController.matchLenders);

// Send lender packet to a specific lender
router.post('/send/:applicationId/:lenderId', lenderController.sendToLender);

export default router;

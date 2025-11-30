import { Router } from 'express';
import * as auditController from '../controllers/auditController.js';

const router = Router();

router.get('/application/:applicationId', auditController.getApplicationAudit);
router.get('/system', auditController.getSystemAudit);

export default router;

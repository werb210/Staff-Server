import { Router } from 'express';
import multer from 'multer';
import * as documentController from '../controllers/documentController.js';

const router = Router();
const upload = multer(); // memory storage

// Upload or replace
router.post('/upload', upload.single('file'), documentController.uploadDocument);

// Get one document (with SAS)
router.get('/:documentId', documentController.getDocument);

// List docs for app
router.get('/application/:applicationId', documentController.listDocuments);

// Accept
router.post('/:documentId/accept', documentController.acceptDocument);

// Reject
router.post('/:documentId/reject', documentController.rejectDocument);

export default router;

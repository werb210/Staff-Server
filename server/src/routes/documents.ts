// server/src/routes/documents.ts
import { Router } from 'express';
import multer from 'multer';
import * as documentController from '../controllers/documentController.js';

const router = Router();
const upload = multer(); // memory storage

// Upload or update a document
router.post('/upload', upload.single('file'), documentController.uploadDocument);

// Get document with SAS URL
router.get('/:documentId', documentController.getDocument);

// List all docs for application
router.get('/application/:applicationId', documentController.listDocuments);

export default router;

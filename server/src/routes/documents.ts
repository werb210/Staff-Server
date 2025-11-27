import express = require('express');
import multer = require('multer');
import { authenticateRequest } from '../services/authService';
import { checkMissingFiles, downloadDocument, getVersionHistory, previewDocument, recordNewVersion, triggerOcr, uploadDocument, verifyChecksum } from '../services/documentService';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post('/', authenticateRequest, upload.single('file'), async (req, res, next) => {
  try {
    const user = (req as express.Request & { user?: { id: string } }).user;
    if (!user || !req.file) {
      res.status(400).json({ error: 'File and authentication required' });
      return;
    }
    const document = await uploadDocument({
      ownerId: user.id,
      fileName: req.file.originalname,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      metadata: req.body?.metadata ? JSON.parse(req.body.metadata) : undefined,
    });
    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
});

router.get('/:documentId/download', authenticateRequest, async (req, res, next) => {
  try {
    const result = await downloadDocument(req.params.documentId, req.query.versionId as string | undefined);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.buffer);
  } catch (error) {
    next(error);
  }
});

router.get('/:documentId/preview', authenticateRequest, async (req, res, next) => {
  try {
    const result = await previewDocument(req.params.documentId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:documentId/versions', authenticateRequest, async (req, res, next) => {
  try {
    const versions = await getVersionHistory(req.params.documentId);
    res.json(versions);
  } catch (error) {
    next(error);
  }
});

router.post('/:documentId/verify', authenticateRequest, async (req, res, next) => {
  try {
    const verification = await verifyChecksum(req.params.documentId, req.body?.versionId);
    res.json(verification);
  } catch (error) {
    next(error);
  }
});

router.post('/:documentId/ocr', authenticateRequest, async (req, res, next) => {
  try {
    const result = await triggerOcr(req.params.documentId, req.body?.versionId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/:documentId/version', authenticateRequest, upload.single('file'), async (req, res, next) => {
  try {
    const user = (req as express.Request & { user?: { id: string } }).user;
    if (!user || !req.file) {
      res.status(400).json({ error: 'File and authentication required' });
      return;
    }
    const version = await recordNewVersion(req.params.documentId, {
      uploaderId: user.id,
      fileName: req.file.originalname,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      metadata: req.body?.metadata ? JSON.parse(req.body.metadata) : undefined,
    });
    res.status(201).json(version);
  } catch (error) {
    next(error);
  }
});

router.get('/:documentId/missing', authenticateRequest, async (req, res, next) => {
  try {
    const status = await checkMissingFiles(req.params.documentId);
    res.json(status);
  } catch (error) {
    next(error);
  }
});

export = router;

import { Router } from "express";
import multer from "multer";
import { AppError } from "../middleware/errors";
import { safeHandler } from "../middleware/safeHandler";
import {
  createDocument,
  createDocumentVersion,
  findApplicationById,
  getLatestDocumentVersion,
} from "../modules/applications/applications.repo";
import { getDocumentMaxSizeBytes } from "../config";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: getDocumentMaxSizeBytes(),
  },
});

const router = Router();

router.post(
  "/",
  upload.single("file"),
  safeHandler(async (req, res) => {
    const applicationId = typeof req.body?.applicationId === "string"
      ? req.body.applicationId.trim()
      : "";
    const category =
      typeof req.body?.category === "string" ? req.body.category.trim() : "";
    if (!applicationId) {
      throw new AppError("validation_error", "applicationId is required.", 400);
    }
    if (!category) {
      throw new AppError("validation_error", "category is required.", 400);
    }
    if (!req.file) {
      throw new AppError("validation_error", "file is required.", 400);
    }

    const application = await findApplicationById(applicationId);
    if (!application) {
      throw new AppError("not_found", "Application not found.", 404);
    }

    const document = await createDocument({
      applicationId,
      ownerUserId: application.owner_user_id,
      title: req.file.originalname,
      documentType: category,
    });
    const nextVersion = (await getLatestDocumentVersion(document.id)) + 1;
    const storageKey = `documents/${document.id}/${req.file.originalname}`;
    await createDocumentVersion({
      documentId: document.id,
      version: nextVersion,
      metadata: {
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storageKey,
      },
      content: req.file.buffer.toString("base64"),
    });

    res.status(201).json({
      documentId: document.id,
      applicationId,
      category,
      filename: req.file.originalname,
      size: req.file.size,
      storageKey,
      createdAt: document.created_at,
    });
  })
);

export default router;

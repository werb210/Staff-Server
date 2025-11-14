import { Router } from "express";
import multer from "multer";

import {
  uploadDocument,
  getDocument,
  previewDocument,
  downloadDocumentHandler,
  acceptDocumentHandler,
  rejectDocumentHandler,
  downloadAllDocumentsHandler,
} from "../controllers/documentsController.js";

const documentsRouter = Router();
const applicationDocumentsRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

documentsRouter.get("/:silo/:id", getDocument);
documentsRouter.get("/:silo/:id/preview", previewDocument);
documentsRouter.get("/:silo/:id/download", downloadDocumentHandler);
documentsRouter.post("/:silo/:id/accept", acceptDocumentHandler);
documentsRouter.post("/:silo/:id/reject", rejectDocumentHandler);

applicationDocumentsRouter.post(
  "/:silo/:appId/documents",
  upload.single("file"),
  uploadDocument
);
applicationDocumentsRouter.get(
  "/:silo/:appId/documents/archive",
  downloadAllDocumentsHandler
);

export { applicationDocumentsRouter };
export default documentsRouter;

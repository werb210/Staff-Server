import { Router } from "express";
import multer from "multer";

import {
  listApplications,
  getApplication,
  createApplication,
  updateApplication,
  updateStage,
  updateStatus,
  assignApplication,
  submitApplication,
  completeApplication,
  publishApplication,
  deleteApplication,
  uploadDocument,
} from "../controllers/applications/applicationController.js";

const router = Router();

// Only used for /upload
const upload = multer({ storage: multer.memoryStorage() });

/* ---------------------------------------------------------
   APPLICATION CRUD
--------------------------------------------------------- */

router.get("/", listApplications);
router.get("/:id", getApplication);

router.post("/", createApplication);
router.put("/:id", updateApplication);
router.delete("/:id", deleteApplication);

/* ---------------------------------------------------------
   STAGE + STATUS
--------------------------------------------------------- */

router.post("/:id/stage", updateStage);
router.post("/:id/status", updateStatus);

/* ---------------------------------------------------------
   ASSIGNMENT
--------------------------------------------------------- */

router.post("/:id/assign", assignApplication);

/* ---------------------------------------------------------
   SUBMISSION + COMPLETION
--------------------------------------------------------- */

router.post("/:id/submit", submitApplication);
router.post("/:id/complete", completeApplication);

/* ---------------------------------------------------------
   PUBLISH FOR CLIENT PORTAL
--------------------------------------------------------- */

router.post("/:id/publish", publishApplication);

/* ---------------------------------------------------------
   DOCUMENT UPLOAD (metadata only)
   Actual file comes via documents.routes.ts
--------------------------------------------------------- */

router.post("/upload", upload.none(), uploadDocument);

export default router;

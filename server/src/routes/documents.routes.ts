// server/src/routes/documents.routes.ts
import { Router } from "express";
import multer from "multer";
import { documentsController } from "../controllers/documentsController.js";

const router = Router();
const upload = multer();

router.post("/upload", upload.single("file"), documentsController.upload);

export default router;

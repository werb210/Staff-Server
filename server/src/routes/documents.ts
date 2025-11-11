import { Router } from "express";

import { documentService } from "../services/documentService.js";

const router = Router();

router.get("/", (_req, res) => {
  const documents = documentService.listDocuments();
  res.json({ message: "OK", documents });
});

router.post("/", async (req, res, next) => {
  try {
    const document = await documentService.uploadDocument(req.body);
    res.status(201).json({ message: "OK", document });
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from "express";
const router = Router();
const uploadedDocs: Record<string, any> = {};

router.post("/", (req, res) => {
  const id = `DOC-${Date.now()}`;
  uploadedDocs[id] = req.body;
  res.status(201).json({ message: "OK", id });
});

router.get("/", (_req, res) => {
  res.json(Object.values(uploadedDocs));
});

export default router;

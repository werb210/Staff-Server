import { Router } from "express";

const router = Router();

router.post("/upload", (_req, res) => {
  return res.status(200).json({
    id: "doc-1",
    status: "uploaded",
  });
});

export default router;

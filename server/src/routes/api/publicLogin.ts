import { Router } from "express";
const router = Router();

router.post("/sign-in", (req, res) => {
  // Placeholder: link client to existing application
  res.json({ message: "Client sign-in stubbed" });
});

router.get("/portal", (_req, res) => {
  // Placeholder: client portal stub
  res.json({ message: "Client portal stub" });
});

export default router;

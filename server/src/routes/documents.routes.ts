import { Router } from "express";
const router = Router();

router.get("/", (_, res) => {
  res.json({ ok: true, route: "documents root" });
});

export { router };

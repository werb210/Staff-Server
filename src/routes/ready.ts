import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  const deps = req.app.locals.deps;

  // guard invalid deps
  if (!deps || !deps.db) {
    return res.status(503).json({ status: "not_ready" });
  }

  // CRITICAL: DO NOT cache — evaluate live
  if (deps.db.ready === true) {
    return res.status(200).json({ status: "ok" });
  }

  return res.status(503).json({ status: "not_ready" });
});

export default router;

import { Router } from "express";
import { requireAuth } from "../auth/authMiddleware.js";
import { pipelineService } from "../services/pipelineService.js";
import type { Silo } from "../services/db.js";

const toSilos = (value: unknown): Silo[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => item as Silo);
};

const router = Router();

/* ---------------------------------------------------------
   GET ALL APPLICATIONS (for the user's silos only)
--------------------------------------------------------- */
router.get("/", requireAuth, (req, res) => {
  const silos = toSilos((req as any).user?.silos);

  const records = silos.flatMap((silo) =>
    pipelineService.list(silo).map((record) => ({ ...record, silo }))
  );

  return res.json(records);
});

/* ---------------------------------------------------------
   GET SINGLE APPLICATION (silo-locked)
--------------------------------------------------------- */
router.get("/:id", requireAuth, (req, res) => {
  const silos = toSilos((req as any).user?.silos);
  const id = req.params.id;

  for (const silo of silos) {
    const record = pipelineService.get(silo, id);
    if (record) {
      return res.json(record);
    }
  }

  return res.status(404).json({ error: "Not found or silo blocked" });
});

/* ---------------------------------------------------------
   MOVE APPLICATION TO A NEW STAGE
--------------------------------------------------------- */
router.post("/:id/move", requireAuth, (req, res) => {
  const silos = toSilos((req as any).user?.silos);
  const id = req.params.id;
  const { stage } = req.body ?? {};

  if (typeof stage !== "string" || stage.trim().length === 0) {
    return res.status(400).json({ error: "stage is required" });
  }

  for (const silo of silos) {
    const updated = pipelineService.updateStage(silo, id, stage);
    if (updated) {
      return res.json(updated);
    }
  }

  return res.status(404).json({ error: "Not found or silo blocked" });
});

export default router;

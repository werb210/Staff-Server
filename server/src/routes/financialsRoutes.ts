import { Router } from "express";
import {
  getAllFinancials,
  getFinancialsById,
  createFinancials,
  updateFinancials,
  deleteFinancials,
} from "../services/financialsService.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const financials = await getAllFinancials();
    res.json(financials);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "ID is required" });
    }

    const financial = await getFinancialsById(id);
    res.json(financial);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const financial = await createFinancials(req.body);
    res.json(financial);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "ID is required" });
    }

    const financial = await updateFinancials(id, req.body);
    res.json(financial);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "ID is required" });
    }

    const financial = await deleteFinancials(id);
    res.json(financial);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

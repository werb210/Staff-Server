import express from "express";
import { ok, fail } from "../middleware/response";

const router = express.Router();

// Basic pass-through (wire to OpenAI or agent later)
router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    // Placeholder — replace with real AI agent call
    return ok(res, {
      reply: `Maya received: ${message}`,
    });
  } catch (e) {
    return fail(res, 500, "maya_error");
  }
});

export default router;

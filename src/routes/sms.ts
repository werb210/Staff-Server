import express from "express";
import { ok } from "../lib/response";

const router = express.Router();

router.post("/incoming", (req, res) => {
  console.log("Inbound SMS:", req.body);
  return ok(res, "<Response></Response>");
});

export default router;

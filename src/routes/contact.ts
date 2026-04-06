import express, { Request, Response } from "express";
import { requireFields } from "../middleware/validate.js";
import { ok } from "../lib/response";

const router = express.Router();

router.post(
  "/",
  requireFields(["name", "email", "message"]),
  (req: Request, res: Response) => {
    return res["json"](ok({ received: true }));
  }
);

export default router;

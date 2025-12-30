import { Router } from "express";
import { getUsersStatus } from "./users.service";

const router = Router();

router.get("/", (_req, res) => {
  res.json(getUsersStatus());
});

export default router;

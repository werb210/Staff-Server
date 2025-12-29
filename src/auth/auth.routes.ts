import { Router } from "express";
import {
  login,
  logout,
  refresh,
  me,
  status,
} from "./auth.controller";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", me);
router.get("/status", status);

export default router;

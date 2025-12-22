import { Router } from "express";
import { createUser } from "./users.js";

const router = Router();

router.post("/", createUser);

export default router;

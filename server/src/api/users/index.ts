import { Router } from "express";
import { createUser } from "./users";

const router = Router();

router.post("/", createUser);

export default router;

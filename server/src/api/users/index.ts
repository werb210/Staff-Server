import { Router } from "express";
import { listUsers } from "./users.js";
import { getUserById } from "./user-by-id.js";

const router = Router();

router.get("/", listUsers);
router.get("/:id", getUserById);

export default router;

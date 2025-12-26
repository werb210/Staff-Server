import { Router } from "express";
import { getUserById } from "./user-by-id.js";
import { createUser } from "./users.js";
const router = Router();
router.get("/", (_req, res) => {
    res.json([]);
});
router.get("/:id", getUserById);
router.post("/", createUser);
export default router;

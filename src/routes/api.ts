import { Router } from "express";
import health from "./health";
import auth from "./auth";
import users from "./users";
import system from "./system";

const router = Router();

router.use("/health", health);
router.use("/auth", auth);
router.use("/users", users);
router.use("/system", system);

export default router;

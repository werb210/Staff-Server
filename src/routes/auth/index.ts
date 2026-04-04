import { Router } from "express";

import otp from "./otp";
import { authMeHandler } from "./me";

const router = Router();

router.use("/otp", otp);
router.get("/me", authMeHandler);

export default router;

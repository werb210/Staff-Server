import { Router } from "express";
import clientSubmissionRoutes from "../modules/clientSubmission/clientSubmission.routes";

const router = Router();

router.use("/", clientSubmissionRoutes);

export default router;

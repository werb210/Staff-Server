import { Router } from "express";
import { authMiddleware, siloGuard } from "../middlewares/index.js";

import applications from "./applications.routes.js";
import documents from "./documents.routes.js";
import lenders from "./lenders.routes.js";
import pipeline from "./pipeline.routes.js";
import communications from "./communications.routes.js";
import notifications from "./notifications.routes.js";
import ai from "./ai.routes.js";

const router = Router();
const siloRouter = Router({ mergeParams: true });

router.use(authMiddleware);

siloRouter.use("/applications", applications);
siloRouter.use("/documents", documents);
siloRouter.use("/lenders", lenders);
siloRouter.use("/pipeline", pipeline);
siloRouter.use("/communications", communications);
siloRouter.use("/notifications", notifications);

router.use("/:silo", siloGuard, siloRouter);
router.use("/ai", siloGuard, ai);

export default router;

// server/src/routes/index.ts
import { Router } from "express";

import contactsRoutes from "./contacts.routes.js";
import usersRoutes from "./users.routes.js";
import pipelineRoutes from "./pipeline.routes.js";
import notificationsRoutes from "./notifications.routes.js";

const router = Router();

router.use("/contacts", contactsRoutes);
router.use("/users", usersRoutes);
router.use("/pipeline", pipelineRoutes);
router.use("/notifications", notificationsRoutes);

export default router;

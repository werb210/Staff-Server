import { Router } from "express";

import { errorHandler, notFoundHandler } from "./middleware/errors";
import { enforceSecureCookies, requireHttps } from "./middleware/security";
import { idempotencyMiddleware } from "./middleware/idempotency";
import { registerApiRouteMounts } from "./routes/routeRegistry";
import { healthHandler, readyHandler } from "./routes/ready";

const router = Router();

router.use(requireHttps);
router.use(enforceSecureCookies);
router.use(idempotencyMiddleware);

router.get("/health", healthHandler);
router.get("/ready", readyHandler);

registerApiRouteMounts(router);

router.use(notFoundHandler);
router.use(errorHandler);

export default router;

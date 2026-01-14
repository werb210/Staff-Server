import { Router } from "express";

import { errorHandler, notFoundHandler } from "./middleware/errors";
import { enforceSecureCookies, requireHttps } from "./middleware/security";
import { idempotencyMiddleware } from "./middleware/idempotency";
import { registerApiRouteMounts } from "./routes/routeRegistry";

const router = Router();

router.use(requireHttps);
router.use(enforceSecureCookies);
router.use(idempotencyMiddleware);

registerApiRouteMounts(router);

router.use(notFoundHandler);
router.use(errorHandler);

export default router;

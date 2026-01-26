import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { safeHandler } from "../../middleware/safeHandler";
import { isProductionEnvironment } from "../../config";
import { sendNotification } from "../../services/pushService";
import { pushSendRateLimit } from "../../middleware/rateLimit";
import { replaySyncBatch } from "../../services/pwaSyncService";
import { AppError } from "../../middleware/errors";

const router = Router();

function assertNonProd(): void {
  if (isProductionEnvironment()) {
    throw new AppError("not_found", "Not available in production.", 404);
  }
}

router.post(
  "/pwa/test-push",
  requireAuth,
  pushSendRateLimit(),
  safeHandler(async (req, res) => {
    assertNonProd();
    const payload = {
      title: "Test notification",
      body: "Staff PWA test push",
      level: "normal" as const,
      sound: false,
      data: "/",
    };
    const result = await sendNotification(req.user!.userId, payload);
    res.status(200).json({ ok: true, result });
  })
);

router.post(
  "/pwa/test-sync",
  requireAuth,
  safeHandler(async (req, res) => {
    assertNonProd();
    const requestId = res.locals.requestId ?? "unknown";
    const user = req.user!;
    const result = await replaySyncBatch({
      user: {
        userId: user.userId,
        role: user.role,
        lenderId: user.lenderId,
        capabilities: user.capabilities ?? [],
      },
      payload: req.body ?? {},
      requestId,
    });
    res.status(200).json({
      ok: true,
      batchId: result.batchId,
      results: result.results,
    });
  })
);

export default router;

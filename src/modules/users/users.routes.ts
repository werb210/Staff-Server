import { Router, type Request } from "express";
import { AppError } from "../../middleware/errors";
import { createUserAccount } from "../auth/auth.service";
import { setUserStatus } from "./users.service";

const router = Router();

function getUserAgent(req: Request): string | undefined {
  const header = req.headers["user-agent"];
  return typeof header === "string" ? header : undefined;
}

router.post("/", async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      throw new AppError(
        "missing_fields",
        "Email, password, and role are required.",
        400
      );
    }
    const user = await createUserAccount({ email, password, role });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/disable", async (req, res, next) => {
  try {
    const actorId = req.user?.userId;
    if (!actorId) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    await setUserStatus({
      userId: req.params.id,
      active: false,
      actorId,
      ip: req.ip,
      userAgent: getUserAgent(req),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/enable", async (req, res, next) => {
  try {
    const actorId = req.user?.userId;
    if (!actorId) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    await setUserStatus({
      userId: req.params.id,
      active: true,
      actorId,
      ip: req.ip,
      userAgent: getUserAgent(req),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

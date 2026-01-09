import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/errors";
import {
  createUserAccount,
  requestPasswordReset,
  unlockUserAccount,
} from "../auth/auth.service";
import { changeUserRole, setUserStatus } from "./users.service";
import { isRole } from "../../auth/roles";
import { CAPABILITIES } from "../../auth/capabilities";

const router = Router();

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      throw new AppError("missing_fields", "Email, password, and role are required.", 400);
    }
    if (typeof role !== "string" || !isRole(role)) {
      throw new AppError("invalid_role", "Role is invalid.", 400);
    }
    const user = await createUserAccount({
      email,
      password,
      role,
      actorUserId: req.user?.userId ?? null,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/role", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actorId = req.user?.userId;
    if (!actorId) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    const { role } = req.body ?? {};
    if (typeof role !== "string" || !isRole(role)) {
      throw new AppError("invalid_role", "Role is invalid.", 400);
    }
    await changeUserRole({
      userId: req.params.id,
      role,
      actorId,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/disable", async (req: Request, res: Response, next: NextFunction) => {
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
      userAgent: req.get("user-agent"),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/enable", async (req: Request, res: Response, next: NextFunction) => {
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
      userAgent: req.get("user-agent"),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:id/force-password-reset",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = req.user?.userId;
      if (!actorId) {
        throw new AppError("missing_token", "Authorization token is required.", 401);
      }
      const token = await requestPasswordReset({
        userId: req.params.id,
        actorUserId: actorId,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.json({ token });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/:id/unlock", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actorId = req.user?.userId;
    if (!actorId) {
      throw new AppError("missing_token", "Authorization token is required.", 401);
    }
    if (!req.user?.capabilities.includes(CAPABILITIES.ACCOUNT_UNLOCK)) {
      throw new AppError("forbidden", "Admin access required.", 403);
    }
    await unlockUserAccount({
      userId: req.params.id,
      actorUserId: actorId,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router } from "express";
import { AppError } from "../../middleware/errors";
import { createUserAccount } from "../auth/auth.service";
import { changeUserRole, setUserStatus } from "./users.service";
import { isRole } from "../../auth/roles";

const router = Router();

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
    if (typeof role !== "string" || !isRole(role)) {
      throw new AppError("invalid_role", "Role is invalid.", 400);
    }
    const user = await createUserAccount({
      email,
      password,
      role,
      actorUserId: req.user?.userId ?? null,
      ip: req.ip,
    });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/role", async (req, res, next) => {
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
    });
    res.json({ ok: true });
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
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

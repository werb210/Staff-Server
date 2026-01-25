import { Request, Response, NextFunction } from "express";
import { verifyAccessTokenWithUser } from "../auth/jwt";
import { getCapabilitiesForRole } from "../auth/capabilities";
import { isRole } from "../auth/roles";
import { assertLenderBinding } from "../auth/lenderBinding";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "missing_token" });
  }

  const token = auth.slice(7);
  let authResult: Awaited<ReturnType<typeof verifyAccessTokenWithUser>>;
  try {
    authResult = await verifyAccessTokenWithUser(token);
  } catch {
    return res.status(401).json({ ok: false, error: "invalid_token" });
  }

  const user = authResult.user;

  const isDisabled =
    user.status !== "active" ||
    user.disabled === true ||
    user.isActive === false ||
    user.active === false;
  if (isDisabled) {
    return res.status(403).json({ ok: false, error: "user_disabled" });
  }

  if (!isRole(user.role)) {
    return res.status(403).json({ ok: false, error: "invalid_role" });
  }

  let lenderId: string | null = null;
  try {
    lenderId = assertLenderBinding({ role: user.role, lenderId: user.lenderId });
  } catch (err) {
    if (err instanceof Error) {
      return res
        .status(400)
        .json({ ok: false, error: "invalid_lender_binding", message: err.message });
    }
    return res
      .status(400)
      .json({ ok: false, error: "invalid_lender_binding" });
  }

  req.user = {
    userId: user.id,
    role: user.role,
    silo: user.silo ?? "",
    siloFromToken: false,
    lenderId,
    capabilities: getCapabilitiesForRole(user.role),
  };

  next();
}

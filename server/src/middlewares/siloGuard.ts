// server/src/middlewares/siloGuard.ts
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.js";

export default function siloGuard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const siloParam = req.params.silo;

    if (!siloParam || typeof siloParam !== "string") {
      return res.status(400).json({ error: "Missing silo parameter" });
    }

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userSilos = req.user.silos || [];

    // Normalize both sides
    const target = siloParam.toLowerCase();

    const allowed = userSilos.some(
      (s: string) => typeof s === "string" && s.toLowerCase() === target
    );

    if (!allowed) {
      return res.status(403).json({
        error: "Access denied for this silo",
        silo: siloParam,
      });
    }

    return next();
  } catch (err: any) {
    console.error("siloGuard error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

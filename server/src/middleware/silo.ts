import type { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

import { AllSilos, type Silo } from "../silos/siloTypes.js";

const prisma = new PrismaClient();

/**
 * Silo Enforcement Middleware
 * - Reads user → allowed silos
 * - Reads request → selected silo
 * - Ensures strict isolation (no cross-silo leakage)
 */
export async function siloMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  try {
    const userIdHeader = req.headers["x-user-id"];

    if (!userIdHeader || typeof userIdHeader !== "string") {
      return res.status(401).json({ error: "Missing x-user-id header" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userIdHeader },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid user" });
    }

    const siloHeader = req.headers["x-silo"];

    if (!siloHeader || typeof siloHeader !== "string") {
      return res
        .status(400)
        .json({ error: "Missing x-silo header (BF | BI | SLF)" });
    }

    const silo = siloHeader.toUpperCase() as Silo;

    if (!AllSilos.includes(silo)) {
      return res.status(400).json({ error: "Invalid silo header" });
    }

    const userSilos = Array.isArray(user.silos)
      ? (user.silos as Silo[])
      : [];

    if (!userSilos.includes(silo)) {
      return res
        .status(403)
        .json({ error: `Access denied. User does not belong to silo ${silo}.` });
    }

    req.silo = silo;
    req.user = user;

    return next();
  } catch (err) {
    console.error("Silo middleware failure:", err);
    return res
      .status(500)
      .json({ error: "Internal silo enforcement error" });
  }
}

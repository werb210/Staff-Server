// middlewares/index.js
// ---------------------------------------------------------
// Central export hub for all middleware
// ---------------------------------------------------------

import jwt from "jsonwebtoken";

// ---------------------------------------------------------
// Async wrapper for Express 5
// ---------------------------------------------------------
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ---------------------------------------------------------
// AUTH MIDDLEWARE
// ---------------------------------------------------------
export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Missing token" });
  }

  const token = header.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
};

// ---------------------------------------------------------
// SILO GUARD
// Validates :silo param (e.g., 'bf', 'slf')
// ---------------------------------------------------------
export const siloGuard = (req, res, next) => {
  const { silo } = req.params;

  if (!silo || typeof silo !== "string") {
    return res.status(400).json({
      ok: false,
      error: "Missing silo in the route",
    });
  }

  const allowed = ["bf", "slf"];

  if (!allowed.includes(silo.toLowerCase())) {
    return res.status(400).json({
      ok: false,
      error: `Invalid silo '${silo}'. Allowed: ${allowed.join(", ")}`,
    });
  }

  next();
};

export default {
  asyncHandler,
  authMiddleware,
  siloGuard,
};

import { RequestHandler } from "express";

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthenticated" });
  }
  next();
};

export default requireAuth;

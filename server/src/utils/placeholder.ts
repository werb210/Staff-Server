import type { Request, Response } from "express";

export const respondWithPlaceholder = (res: Response) =>
  res.json({ message: "Placeholder" });

export const isPlaceholderSilo = (req: Request): boolean => req.silo?.silo === "BI";

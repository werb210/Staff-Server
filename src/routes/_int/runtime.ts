import { Request, Response } from "express";

export const runtimeHandler = (req: Request, res: Response) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
  });
};

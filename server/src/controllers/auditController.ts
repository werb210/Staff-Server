import { Request, Response } from "express";
import auditLogsRepo from "../db/repositories/auditLogs.repo.js";
import asyncHandler from "../utils/asyncHandler.js";

export const auditController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const logs = await auditLogsRepo.findMany({});
    res.json(logs);
  }),
};

export default auditController;

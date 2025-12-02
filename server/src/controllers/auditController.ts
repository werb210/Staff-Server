import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import auditLogsRepo from "../db/repositories/auditLogs.repo.js";

export const auditController = {
  getApplicationAudit: asyncHandler(async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const rows = await auditLogsRepo.findMany({ applicationId });
    res.json(rows);
  }),

  getSystemAudit: asyncHandler(async (_req: Request, res: Response) => {
    const rows = await auditLogsRepo.findMany({});
    res.json(rows);
  }),
};

export default auditController;

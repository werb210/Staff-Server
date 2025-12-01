import { Request, Response } from "express";
import auditLogsRepo from "../db/repositories/auditLogs.repo.js";
import asyncHandler from "../utils/asyncHandler.js";

const mapTag = (record: any) => {
  if (!record || record.eventType !== "tag") return null;
  const details = (record.details ?? {}) as Record<string, unknown>;
  return { id: record.id, ...details, createdAt: record.createdAt } as any;
};

export const tagController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const records = await auditLogsRepo.findMany({ eventType: "tag" });
    const data = (records as any[]).map(mapTag).filter(Boolean);
    res.status(200).json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, color = null } = req.body ?? {};

    if (!name || typeof name !== "string") {
      return res.status(400).json({ success: false, error: "Missing or invalid 'name'" });
    }

    const created = await auditLogsRepo.create({
      eventType: "tag",
      details: { name, color },
    });

    res.status(201).json({ success: true, data: mapTag(created) });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, color } = req.body ?? {};

    const existing = await auditLogsRepo.findById(id);
    if (!existing || existing.eventType !== "tag") {
      return res.status(404).json({ success: false, error: "Tag not found" });
    }

    const mergedDetails = {
      ...(existing.details ?? {}),
      ...(name !== undefined ? { name } : {}),
      ...(color !== undefined ? { color } : {}),
    } as Record<string, unknown>;

    const updated = await auditLogsRepo.update(id, { details: mergedDetails } as any);

    res.status(200).json({ success: true, data: mapTag(updated) });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = await auditLogsRepo.delete(id);

    if (!deleted || deleted.eventType !== "tag") {
      return res.status(404).json({ success: false, error: "Tag not found" });
    }

    res.status(200).json({ success: true, data: mapTag(deleted) });
  }),
};

export default tagController;

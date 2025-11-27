// server/src/controllers/tagController.ts
import type { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import tagService from "../services/tagService";

const tagController = {
  /**
   * Get all tags
   */
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await tagService.list();
    res.status(200).json({ success: true, data });
  }),

  /**
   * Get stats
   */
  stats: asyncHandler(async (_req: Request, res: Response) => {
    const data = await tagService.list();
    res.status(200).json({ success: true, data });
  }),

  /**
   * Get tag types (placeholder)
   */
  getAllTagTypes: asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: [] });
  }),

  /**
   * Get a single tag
   */
  get: asyncHandler(async (req: Request, res: Response) => {
    const tagId = req.params.id;
    const data = await tagService.get(tagId);
    if (!data) {
      return res.status(404).json({ success: false, error: "Tag not found" });
    }
    res.status(200).json({ success: true, data });
  }),

  /**
   * Create a new tag
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, color } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: "Name is required" });
    }
    const data = await tagService.create(name, color);
    res.status(201).json({ success: true, data });
  }),

  /**
   * Create many tags at once
   */
  createMany: asyncHandler(async (req: Request, res: Response) => {
    const { tags } = req.body;
    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        success: false,
        error: "tags must be a non-empty array",
      });
    }

    const created = await Promise.all(
      tags.map((tag: { name: string; color?: string }) =>
        tagService.create(tag.name, tag.color),
      ),
    );

    res.status(201).json({ success: true, data: created });
  }),

  /**
   * Update a tag
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const tagId = req.params.id;
    const { name, color } = req.body;

    const data = await tagService.update(tagId, { name, color });
    res.status(200).json({ success: true, data });
  }),

  /**
   * Delete a tag
   */
  remove: asyncHandler(async (req: Request, res: Response) => {
    const tagId = req.params.id;
    const data = await tagService.remove(tagId);
    res.status(200).json({ success: true, data });
  }),

  /**
   * Bulk delete tags
   */
  bulkDelete: asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: "ids must be a non-empty array",
      });
    }

    const deleted = await Promise.all(ids.map((id: string) => tagService.remove(id)));
    res.status(200).json({ success: true, data: deleted });
  }),
};

export default tagController;

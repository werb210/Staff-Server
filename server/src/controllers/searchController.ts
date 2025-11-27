// server/src/controllers/searchController.ts
import type { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import searchService from "../services/searchService";

export const searchController = {
  /**
   * Global search across companies, contacts, and applications
   */
  search: asyncHandler(async (req: Request, res: Response) => {
    const query = (req.query.q as string) || (req.query.query as string) || "";
    const data = await searchService.globalSearch(query);

    res.status(200).json({ success: true, data });
  }),
};

export default searchController;

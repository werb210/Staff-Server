import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import applicationsRepo from "../db/repositories/applications.repo.js";
import companiesRepo from "../db/repositories/companies.repo.js";
import contactsRepo from "../db/repositories/contacts.repo.js";

export const searchController = {
  globalSearch: asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query;

    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Missing query" });
    }

    const apps = await applicationsRepo.search(q).catch(() => []);
    const companies = await companiesRepo.findMany({ name: q }).catch(() => []);
    const contacts = await contactsRepo.findMany({ name: q }).catch(() => []);

    res.json({
      applications: apps,
      companies,
      contacts,
    });
  }),
};

export default searchController;

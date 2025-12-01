import { Request, Response } from "express";
import applicationsRepo from "../db/repositories/applications.repo.js";
import companiesRepo from "../db/repositories/companies.repo.js";
import contactsRepo from "../db/repositories/contacts.repo.js";
import lendersRepo from "../db/repositories/lenders.repo.js";
import asyncHandler from "../utils/asyncHandler.js";

const contains = (value: unknown, query: string) => {
  if (value === undefined || value === null) return false;
  return String(value).toLowerCase().includes(query.toLowerCase());
};

const filterList = <T extends Record<string, unknown>>(list: T[], query: string, keys: (keyof T)[]) =>
  list.filter((item) => keys.some((key) => contains(item?.[key], query)));

export const searchController = {
  search: asyncHandler(async (req: Request, res: Response) => {
    const rawQuery = String(req.query.q ?? "").trim();

    if (!rawQuery) {
      return res.json({ apps: [], contacts: [], companies: [], lenders: [] });
    }

    const query = rawQuery.toLowerCase();

    const [applications, contacts, companies, lenders] = await Promise.all([
      applicationsRepo.findMany(),
      contactsRepo.findMany(),
      companiesRepo.findMany(),
      lendersRepo.findMany(),
    ]);

    const apps = filterList(applications as any[], query, ["id", "status", "pipelineStage", "currentStep"] as any)
      .slice(0, 50);

    const matchedContacts = filterList(contacts as any[], query, ["firstName", "lastName", "email", "phone"] as any)
      .slice(0, 50);

    const matchedCompanies = filterList(companies as any[], query, ["name", "website", "phone", "address"] as any)
      .slice(0, 50);

    const matchedLenders = filterList(
      lenders as any[],
      query,
      ["lenderName", "productCategory", "creditRequirements"] as any,
    ).slice(0, 50);

    res.json({ apps, contacts: matchedContacts, companies: matchedCompanies, lenders: matchedLenders });
  }),
};

export default searchController;

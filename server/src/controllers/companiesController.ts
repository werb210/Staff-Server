// FILE: server/src/controllers/companiesController.ts
import { Request, Response } from "express";
import companiesService from "../services/companiesService.js";

export const getAllCompanies = async (_req: Request, res: Response) => {
  res.json(await companiesService.getAllCompanies());
};

export const getCompanyById = async (req: Request, res: Response) => {
  const company = await companiesService.getCompanyById(req.params.id);
  if (!company) return res.status(404).json({ error: "Not found" });
  res.json(company);
};

export const createCompany = async (req: Request, res: Response) => {
  res.status(201).json(await companiesService.createCompany(req.body));
};

export default {
  getAllCompanies,
  getCompanyById,
  createCompany,
};

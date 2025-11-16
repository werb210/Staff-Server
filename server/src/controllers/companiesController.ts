import { Request, Response } from "express";
import * as companiesService from "../services/companiesService.js";

export async function listCompanies(req: Request, res: Response) {
  return res.json(await companiesService.getCompanies());
}

export async function createCompany(req: Request, res: Response) {
  const company = await companiesService.createCompany(req.body);
  return res.status(201).json(company);
}

export async function getCompany(req: Request, res: Response) {
  const company = await companiesService.getCompany(req.params.id);
  if (!company) return res.status(404).json({ error: "Company not found" });
  return res.json(company);
}

export async function updateCompany(req: Request, res: Response) {
  const updated = await companiesService.updateCompany(req.params.id, req.body);
  return res.json(updated);
}

export async function deleteCompany(req: Request, res: Response) {
  await companiesService.deleteCompany(req.params.id);
  return res.status(204).send();
}

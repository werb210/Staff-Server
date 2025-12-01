// server/src/controllers/contactsController.ts

import { Request, Response } from "express";
import * as contactsRepo from "../db/repositories/contacts.repo";
import { asyncHandler } from "../utils/asyncHandler";
import { z } from "zod";

const contactSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  companyId: z.string().optional(),
});

export const listContacts = asyncHandler(async (_req: Request, res: Response) => {
  const contacts = await contactsRepo.getAllContacts();
  res.json({ success: true, data: contacts });
});

export const getContact = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const contact = await contactsRepo.getContactById(id);

  if (!contact) {
    return res.status(404).json({ success: false, message: "Contact not found" });
  }

  res.json({ success: true, data: contact });
});

export const createContact = asyncHandler(async (req: Request, res: Response) => {
  const parsed = contactSchema.parse(req.body);
  const created = await contactsRepo.createContact(parsed);
  res.status(201).json({ success: true, data: created });
});

export const updateContact = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const parsed = contactSchema.partial().parse(req.body);

  const updated = await contactsRepo.updateContact(id, parsed);
  if (!updated) {
    return res.status(404).json({ success: false, message: "Contact not found" });
  }

  res.json({ success: true, data: updated });
});

export const deleteContact = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;

  const deleted = await contactsRepo.deleteContact(id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: "Contact not found" });
  }

  res.json({ success: true, data: true });
});

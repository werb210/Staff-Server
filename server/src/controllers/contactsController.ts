import { Request, Response } from "express";
import contactsRepo from "../db/repositories/contacts.repo.js";
import asyncHandler from "../utils/asyncHandler.js";

export const contactsController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const contacts = await contactsRepo.findMany({});
    res.json(contacts);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body;
    const contact = await contactsRepo.create(payload);
    res.json(contact);
  }),
};

export default contactsController;

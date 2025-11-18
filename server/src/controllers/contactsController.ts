// server/src/controllers/contactsController.ts
import { contactsService } from "../services/contactsService.js";

export const contactsController = {
  async list(req, res) {
    res.json(await contactsService.list());
  },

  async get(req, res) {
    res.json(await contactsService.get(req.params.id));
  },

  async create(req, res) {
    res.json(await contactsService.create(req.body));
  },

  async update(req, res) {
    res.json(await contactsService.update(req.params.id, req.body));
  },

  async remove(req, res) {
    res.json(await contactsService.delete(req.params.id));
  },
};

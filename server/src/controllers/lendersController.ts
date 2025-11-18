// server/src/controllers/lendersController.ts
import { lendersService } from "../services/lendersService.js";

export const lendersController = {
  async list(req, res) {
    res.json(await lendersService.list());
  },

  async get(req, res) {
    res.json(await lendersService.get(req.params.id));
  },

  async create(req, res) {
    res.json(await lendersService.create(req.body));
  },

  async update(req, res) {
    res.json(await lendersService.update(req.params.id, req.body));
  },

  async remove(req, res) {
    res.json(await lendersService.delete(req.params.id));
  },
};

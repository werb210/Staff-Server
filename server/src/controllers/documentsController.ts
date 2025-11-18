import { documentsService } from "../services/documentsService.js";

export const documentsController = {
  list: async (_req, res) => {
    res.json(await documentsService.list());
  },

  get: async (req, res) => {
    res.json(await documentsService.get(req.params.id));
  },

  create: async (req, res) => {
    res.json(await documentsService.create(req.body));
  },

  update: async (req, res) => {
    res.json(await documentsService.update(req.params.id, req.body));
  },

  remove: async (req, res) => {
    res.json(await documentsService.delete(req.params.id));
  },
};
